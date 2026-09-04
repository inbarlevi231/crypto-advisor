const ASSET_META = {
  bitcoin: { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  ethereum: { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  solana: { id: 'solana', symbol: 'SOL', name: 'Solana' },
  cardano: { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  dogecoin: { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  ripple: { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  'avalanche-2': { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
  chainlink: { id: 'chainlink', symbol: 'LINK', name: 'Chainlink' },
};

const FALLBACK_PRICES = {
  bitcoin: { usd: 64000, usd_24h_change: 1.2 },
  ethereum: { usd: 3400, usd_24h_change: -0.5 },
  solana: { usd: 145, usd_24h_change: 2.8 },
  cardano: { usd: 0.45, usd_24h_change: 0.3 },
  dogecoin: { usd: 0.12, usd_24h_change: -1.1 },
  ripple: { usd: 0.55, usd_24h_change: 0.8 },
  'avalanche-2': { usd: 28, usd_24h_change: 1.5 },
  chainlink: { usd: 14, usd_24h_change: -0.2 },
};

const PRICE_CACHE_TTL_MS = 90_000;
const priceCache = new Map();

function coingeckoConfig() {
  const apiKey = process.env.COINGECKO_API_KEY || '';
  const usePro = String(process.env.COINGECKO_PRO || '').toLowerCase() === 'true';
  const baseUrl = usePro
    ? 'https://pro-api.coingecko.com/api/v3'
    : 'https://api.coingecko.com/api/v3';
  const headers = { Accept: 'application/json' };
  if (apiKey) {
    headers[usePro ? 'x-cg-pro-api-key' : 'x-cg-demo-api-key'] = apiKey;
  }
  return { baseUrl, headers };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCoinGecko(path) {
  const { baseUrl, headers } = coingeckoConfig();
  const url = `${baseUrl}${path}`;
  let lastError;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) {
        return res.json();
      }
      lastError = new Error(`CoinGecko ${res.status}`);
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === 3) throw lastError;
    } catch (err) {
      lastError = err;
      const status = Number(/CoinGecko (\d+)/.exec(err.message)?.[1]);
      const retryable = !status || status === 429 || status >= 500;
      if (!retryable || attempt === 3) throw err;
      await sleep(700 * 2 ** attempt + Math.floor(Math.random() * 250));
    }
  }

  throw lastError || new Error('CoinGecko request failed');
}

function cacheKey(assets) {
  return [...assets].filter(Boolean).sort().join(',');
}

function getCachedPrices(assets) {
  const key = cacheKey(assets);
  const hit = priceCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > PRICE_CACHE_TTL_MS) {
    priceCache.delete(key);
    return null;
  }
  return hit.rows;
}

function setCachedPrices(assets, rows) {
  if (!rows?.length || rows.every((r) => r.source === 'fallback')) return;
  priceCache.set(cacheKey(assets), { at: Date.now(), rows });
}

function mapFallbackRows(assets) {
  return assets.map((assetId) => {
    const meta = ASSET_META[assetId] || { id: assetId, symbol: assetId.toUpperCase(), name: assetId };
    const row = FALLBACK_PRICES[assetId] || { usd: null, usd_24h_change: null };
    return {
      id: meta.id,
      name: meta.name,
      symbol: meta.symbol,
      priceUsd: row.usd,
      change24h: row.usd_24h_change,
      source: 'fallback',
    };
  });
}

function buildFallbackSparkline(priceUsd, change24h = 0) {
  const end = Number(priceUsd) || 100;
  const change = Number(change24h) || 0;
  const start = end / (1 + change / 100);
  const points = 8;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const wobble = Math.sin(i * 1.3) * end * 0.008;
    const price = start + (end - start) * t + wobble;
    return {
      ts: now - (points - 1 - i) * day,
      price: Math.round(price * 100) / 100,
    };
  });
}

async function fetchPrices(assets = ['bitcoin', 'ethereum']) {
  const cached = getCachedPrices(assets);
  if (cached) return cached;

  try {
    const ids = assets.filter(Boolean).join(',');
    const data = await fetchCoinGecko(
      `/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true`
    );
    const rows = assets.map((assetId) => {
      const meta = ASSET_META[assetId] || { id: assetId, symbol: assetId.toUpperCase(), name: assetId };
      const row = data[assetId] || FALLBACK_PRICES[assetId] || { usd: null, usd_24h_change: null };
      return {
        id: meta.id,
        name: meta.name,
        symbol: meta.symbol,
        priceUsd: row.usd,
        change24h: row.usd_24h_change,
        source: data[assetId] ? 'coingecko' : 'fallback',
      };
    });
    setCachedPrices(assets, rows);
    return rows;
  } catch (err) {
    console.warn('CoinGecko failed, using fallback:', err.message);
    return mapFallbackRows(assets);
  }
}

async function fetchSparklines(assets = ['bitcoin', 'ethereum'], priceRows = []) {
  const results = {};
  const priceById = Object.fromEntries((priceRows || []).map((p) => [p.id, p]));

  try {
    const ids = assets.filter(Boolean).join(',');
    const data = await fetchCoinGecko(
      `/coins/markets?vs_currency=usd&ids=${encodeURIComponent(ids)}&sparkline=true&price_change_percentage=7d`
    );
    const byId = Object.fromEntries((data || []).map((row) => [row.id, row]));

    for (const assetId of assets) {
      const spark = byId[assetId]?.sparkline_in_7d?.price;
      if (Array.isArray(spark) && spark.length > 1) {
        const step = Math.max(1, Math.floor(spark.length / 24));
        const sampled = spark.filter((_, i) => i % step === 0 || i === spark.length - 1);
        results[assetId] = sampled.map((price, i) => ({
          ts: i,
          price: Math.round(Number(price) * 100) / 100,
        }));
      } else {
        const row = priceById[assetId] || FALLBACK_PRICES[assetId] || {};
        results[assetId] = buildFallbackSparkline(row.priceUsd ?? row.usd, row.change24h ?? row.usd_24h_change);
      }
    }
    return results;
  } catch (err) {
    console.warn('Sparkline markets fetch failed, using fallback series:', err.message);
    for (const assetId of assets) {
      const row = priceById[assetId] || FALLBACK_PRICES[assetId] || {};
      results[assetId] = buildFallbackSparkline(row.priceUsd ?? row.usd, row.change24h ?? row.usd_24h_change);
    }
    return results;
  }
}

module.exports = { fetchPrices, fetchSparklines, ASSET_META };
