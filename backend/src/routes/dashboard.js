const express = require('express');
const Preferences = require('../models/Preferences');
const DailyCache = require('../models/DailyCache');
const { authRequired } = require('../middleware/auth');
const { fetchPrices, fetchSparklines } = require('../services/coingecko');
const { fetchNews } = require('../services/news');
const { generateInsight } = require('../services/ai');
const { pickMeme, pickFunFact } = require('../services/memes');
const { pickSocialBuzz } = require('../services/social');

const router = express.Router();

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function buildDashboard(userId, { forceRefresh = false } = {}) {
  const preferences = await Preferences.findOne({ userId });
  if (!preferences) {
    const err = new Error('Complete onboarding first');
    err.status = 400;
    throw err;
  }

  const dateKey = todayKey();
  if (!forceRefresh) {
    const cached = await DailyCache.findOne({ userId, dateKey });
    if (cached?.payload) {
      const cachedPrefs = cached.payload.preferences || {};
      const sameAssets =
        JSON.stringify([...(cachedPrefs.assets || [])].sort()) ===
        JSON.stringify([...(preferences.assets || [])].sort());
      const sameContent =
        JSON.stringify([...(cachedPrefs.contentTypes || [])].sort()) ===
        JSON.stringify([...(preferences.contentTypes || [])].sort());
      const sameInvestor = cachedPrefs.investorType === preferences.investorType;

      const pricesWereFallback = cached.payload?.sections?.prices?.provider === 'fallback';
      // Don't keep serving a failed CoinGecko day — retry live prices next load.
      if (sameAssets && sameContent && sameInvestor && !pricesWereFallback) {
        return { ...cached.payload, cached: true };
      }
    }
  }

  const assets = preferences.assets;
  const contentTypes = preferences.contentTypes || [];
  const wantsCharts = contentTypes.includes('Charts');
  const wantsFun = contentTypes.includes('Fun');
  const wantsSocial = contentTypes.includes('Social');

  const [prices, newsResult] = await Promise.all([fetchPrices(assets), fetchNews(assets)]);

  let sparklines = null;
  if (wantsCharts) {
    await new Promise((r) => setTimeout(r, 800));
    sparklines = await fetchSparklines(assets, prices);
  }

  const insight = await generateInsight({
    preferences,
    prices,
    newsTitles: newsResult.items.map((n) => n.title),
  });

  const sections = {
    news: {
      id: `news-${dateKey}`,
      title: 'Market News',
      provider: newsResult.provider,
      items: newsResult.items,
    },
    prices: {
      id: `prices-${dateKey}`,
      title: 'Coin Prices',
      provider: prices.some((p) => p.source === 'coingecko') ? 'coingecko' : 'fallback',
      items: prices,
    },
    insight: {
      id: insight.id,
      title: 'AI Insight of the Day',
      provider: insight.provider,
      text: insight.text,
      social: null,
    },
  };

  if (wantsCharts && sparklines) {
    sections.charts = {
      id: `charts-${dateKey}`,
      title: '7-Day Price Charts',
      provider: 'coingecko',
      items: assets.map((assetId) => {
        const meta = prices.find((p) => p.id === assetId) || { name: assetId, symbol: assetId.toUpperCase() };
        return {
          id: assetId,
          name: meta.name,
          symbol: meta.symbol,
          dataPoints: sparklines[assetId] || [],
        };
      }),
    };
  }

  if (wantsSocial) {
    const social = pickSocialBuzz(assets);
    sections.insight.social = {
      id: social.id,
      text: social.text,
      provider: social.provider,
    };
  }

  const meme = pickMeme(Date.now());
  sections.meme = {
    id: `${meme.id}-${Date.now()}`,
    title: 'Fun Crypto Meme',
    provider: meme.provider,
    memeTitle: meme.title,
    imageUrl: meme.imageUrl,
    alt: meme.alt,
    funFact: wantsFun
      ? (() => {
          const funFact = pickFunFact(Date.now());
          return { id: funFact.id, text: funFact.text };
        })()
      : null,
  };

  const payload = {
    date: dateKey,
    preferences: {
      assets: preferences.assets,
      investorType: preferences.investorType,
      contentTypes: preferences.contentTypes,
    },
    sections,
    cached: false,
  };

  const pricesAreFallback = sections.prices.provider === 'fallback';
  // Avoid locking static fallback prices into the daily cache.
  if (!pricesAreFallback) {
    await DailyCache.findOneAndUpdate(
      { userId, dateKey },
      { userId, dateKey, payload },
      { upsert: true, new: true }
    );
  }

  return payload;
}

router.get('/', authRequired, async (req, res) => {
  try {
    const forceRefresh = String(req.query.refresh || '') === '1';
    const dashboard = await buildDashboard(req.user._id, { forceRefresh });
    res.json(dashboard);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to load dashboard' });
  }
});

module.exports = router;
