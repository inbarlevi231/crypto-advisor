const path = require('path');
const fs = require('fs');

const fallbackPath = path.join(__dirname, '../../data/news-fallback.json');
const staticNews = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));

const ASSET_SEARCH = {
  bitcoin: 'Bitcoin',
  ethereum: 'Ethereum',
  solana: 'Solana',
  cardano: 'Cardano',
  dogecoin: 'Dogecoin',
  ripple: 'XRP',
  'avalanche-2': 'Avalanche',
  chainlink: 'Chainlink',
};

const NEWS_CACHE_TTL_MS = 90_000;
const newsCache = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function filterStatic(assets = []) {
  const needle = assets.map((a) => a.toLowerCase());
  const filtered = staticNews.filter((item) =>
    item.currencies.some((c) => needle.some((n) => c.toLowerCase().includes(n) || n.includes(c.toLowerCase())))
  );
  return (filtered.length ? filtered : staticNews).slice(0, 5).map((item) => ({
    ...item,
    source: item.source || 'Static Fallback',
  }));
}

function toSearchQuery(assets = []) {
  const terms = assets
    .map((a) => ASSET_SEARCH[a] || a)
    .filter(Boolean)
    .slice(0, 3);
  // OR keeps results when not every term appears in one article.
  return terms.join(' OR ') || 'cryptocurrency';
}

function cacheKey(assets) {
  return [...assets].filter(Boolean).sort().join(',');
}

function getCachedNews(assets) {
  const key = cacheKey(assets);
  const hit = newsCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > NEWS_CACHE_TTL_MS) {
    newsCache.delete(key);
    return null;
  }
  return hit.value;
}

function setCachedNews(assets, value) {
  if (!value || value.provider !== 'marketaux') return;
  newsCache.set(cacheKey(assets), { at: Date.now(), value });
}

function mapArticles(data) {
  return (data.data || []).slice(0, 5).map((article) => ({
    id: String(article.uuid || article.id || article.title),
    title: article.title,
    url: article.url || '#',
    source: article.source || 'MarketAux',
    currencies: (article.entities || []).map((e) => e.symbol).filter(Boolean),
  }));
}

async function fetchMarketAux(assets) {
  const token = process.env.MARKETAUX_API_KEY;
  const params = new URLSearchParams({
    api_token: token,
    language: 'en',
    limit: '5',
    search: toSearchQuery(assets),
  });
  const url = `https://api.marketaux.com/v1/news/all?${params.toString()}`;

  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const retryable = res.status === 429 || res.status >= 500;
        lastError = new Error(`MarketAux ${res.status}`);
        if (!retryable || attempt === 2) throw lastError;
      } else {
        return res.json();
      }
    } catch (err) {
      lastError = err;
      const status = Number(/MarketAux (\d+)/.exec(err.message)?.[1]);
      const retryable = !status || status === 429 || status >= 500;
      if (!retryable || attempt === 2) throw err;
    }
    await sleep(600 * 2 ** attempt + Math.floor(Math.random() * 200));
  }
  throw lastError || new Error('MarketAux request failed');
}

async function fetchNews(assets = ['bitcoin', 'ethereum']) {
  const token = process.env.MARKETAUX_API_KEY;
  if (!token) {
    console.warn('MARKETAUX_API_KEY missing; using static news');
    return { items: filterStatic(assets), provider: 'static' };
  }

  const cached = getCachedNews(assets);
  if (cached) return cached;

  try {
    let data = await fetchMarketAux(assets);
    let items = mapArticles(data);

    // Broaden once if the asset-specific query returned nothing.
    if (!items.length) {
      const params = new URLSearchParams({
        api_token: token,
        language: 'en',
        limit: '5',
        search: 'cryptocurrency OR bitcoin',
      });
      const res = await fetch(`https://api.marketaux.com/v1/news/all?${params.toString()}`);
      if (res.ok) {
        data = await res.json();
        items = mapArticles(data);
      }
    }

    if (!items.length) {
      throw new Error('MarketAux returned no articles');
    }

    const value = { items, provider: 'marketaux' };
    setCachedNews(assets, value);
    return value;
  } catch (err) {
    console.warn('MarketAux failed, using static news:', err.message);
    return { items: filterStatic(assets), provider: 'static' };
  }
}

module.exports = { fetchNews };
