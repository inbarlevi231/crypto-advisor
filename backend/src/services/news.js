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
  return terms.join(' ') || 'cryptocurrency';
}

async function fetchNews(assets = ['bitcoin', 'ethereum']) {
  const token = process.env.MARKETAUX_API_KEY;
  if (!token) {
    return { items: filterStatic(assets), provider: 'static' };
  }

  try {
    const params = new URLSearchParams({
      api_token: token,
      language: 'en',
      limit: '5',
      search: toSearchQuery(assets),
    });

    const url = `https://api.marketaux.com/v1/news/all?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`MarketAux ${res.status}`);
    }
    const data = await res.json();
    const items = (data.data || []).slice(0, 5).map((article) => ({
      id: String(article.uuid || article.id || article.title),
      title: article.title,
      url: article.url || '#',
      source: article.source || 'MarketAux',
      currencies: (article.entities || [])
        .map((e) => e.symbol)
        .filter(Boolean),
    }));

    if (!items.length) {
      return { items: filterStatic(assets), provider: 'static' };
    }
    return { items, provider: 'marketaux' };
  } catch (err) {
    console.warn('MarketAux failed, using static news:', err.message);
    return { items: filterStatic(assets), provider: 'static' };
  }
}

module.exports = { fetchNews };
