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
  const ids = assets.filter(Boolean).join(',');
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
      ids
    )}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`CoinGecko ${res.status}`);
    }
    const data = await res.json();
    return assets.map((assetId) => {
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
  } catch (err) {
    console.warn('CoinGecko failed, using fallback:', err.message);
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
}

async function fetchSparklines(assets = ['bitcoin', 'ethereum'], priceRows = []) {
  const results = {};
  const priceById = Object.fromEntries((priceRows || []).map((p) => [p.id, p]));

  try {
    const ids = assets.filter(Boolean).join(',');
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(
      ids
    )}&sparkline=true&price_change_percentage=7d`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      throw new Error(`CoinGecko markets ${res.status}`);
    }
    const data = await res.json();
    const byId = Object.fromEntries((data || []).map((row) => [row.id, row]));

    for (const assetId of assets) {
      const spark = byId[assetId]?.sparkline_in_7d?.price;
      if (Array.isArray(spark) && spark.length > 1) {
        // Downsample to keep payload small while preserving shape
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
