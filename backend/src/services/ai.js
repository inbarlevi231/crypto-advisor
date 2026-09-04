function buildFallbackInsight({ preferences, prices }) {
  const contentTypes = preferences.contentTypes || [];
  const wantsSocial = contentTypes.includes('Social');
  const assets = preferences.assets?.join(', ') || 'crypto';

  const moves = (prices || [])
    .filter((p) => p?.priceUsd != null)
    .map((p) => {
      const change = Number(p.change24h || 0);
      const sign = change > 0 ? '+' : '';
      return `${p.symbol || p.name} $${Number(p.priceUsd).toLocaleString()} (${sign}${change.toFixed(2)}% 24h)`;
    });

  const priceBit = moves.length
    ? `Today: ${moves.join('; ')}.`
    : 'Markets are mixed today.';

  const style =
    preferences.investorType === 'DayTrader'
      ? 'Watch intraday volatility and size positions carefully.'
      : preferences.investorType === 'NFTCollector'
        ? 'Keep an eye on blue-chip floor prices and gas conditions.'
        : 'Stay focused on long-term thesis and avoid noise.';

  const socialBit = wantsSocial
    ? ' Community chatter is loud around your picks — weigh sentiment against on-chain reality.'
    : '';

  return {
    id: `fallback-insight-${new Date().toISOString().slice(0, 10)}`,
    text: `As a ${preferences.investorType} interested in ${assets}: ${priceBit} ${style}${socialBit}`,
    provider: 'fallback',
  };
}

function extractInsightText(messageContent) {
  if (typeof messageContent === 'string') {
    return messageContent.trim();
  }

  if (Array.isArray(messageContent)) {
    const parts = messageContent
      .map((p) => {
        if (!p || typeof p !== 'object') return '';
        return (
          (typeof p.text === 'string' && p.text) ||
          (typeof p.content === 'string' && p.content) ||
          ''
        );
      })
      .filter(Boolean);
    return parts.join('\n').trim();
  }

  if (messageContent && typeof messageContent === 'object') {
    if (typeof messageContent.text === 'string') return messageContent.text.trim();
    if (typeof messageContent.content === 'string') return messageContent.content.trim();
  }

  return '';
}

function summarizePrices(prices = []) {
  return (prices || []).map((p) => ({
    symbol: p.symbol,
    name: p.name,
    priceUsd: p.priceUsd,
    change24h: p.change24h == null ? null : Number(Number(p.change24h).toFixed(2)),
  }));
}

function buildPromptExtras(contentTypes = []) {
  const extras = [];
  if (contentTypes.includes('Social')) {
    extras.push(
      'The user cares about Social content: include a short take on community/social sentiment (Twitter/X, Reddit-style buzz) for their assets.'
    );
  }
  if (contentTypes.includes('Fun')) {
    extras.push('Keep the tone light and engaging where it still adds value.');
  }
  return extras.length ? `\nExtra guidance:\n- ${extras.join('\n- ')}` : '';
}

function looksIncomplete(text, finishReason) {
  if (!text || text.length < 40) return true;
  if (finishReason === 'length') return true;
  // Accept soft endings; only reject obvious mid-thought cuts.
  if (/[,:;]\s*$/.test(text)) return true;
  if (/\b(and|or|with|for|to|the|a|an)\s*$/i.test(text)) return true;
  if (!/[.!?]"?$/.test(text)) return true;
  // Ends with a tiny fragment after a space (e.g. "and h")
  if (/\s[A-Za-z]{1,3}$/.test(text)) return true;
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callOpenRouter({ apiKey, prompt, maxTokens }) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
      'X-Title': 'AI Crypto Advisor',
    },
    body: JSON.stringify({
      // Stable small model; avoid auto routing that sometimes truncates.
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You write brief, complete crypto market insights. Always finish your sentences. Always include each asset 24h move when prices are provided. End with a period.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    const err = new Error(`OpenRouter ${res.status}${errBody ? `: ${errBody.slice(0, 180)}` : ''}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return {
    text: extractInsightText(data.choices?.[0]?.message?.content),
    finishReason: data.choices?.[0]?.finish_reason,
  };
}

async function generateInsight({ preferences, prices, newsTitles }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('OPENROUTER_API_KEY missing; using fallback insight');
    return buildFallbackInsight({ preferences, prices });
  }

  const contentTypes = preferences.contentTypes || [];
  const priceSummary = summarizePrices(prices);
  const prompt = `You are a concise crypto advisor. Write exactly 2 complete sentences of insight for today.
Rules:
- Mention EVERY listed asset by symbol and its 24h % change.
- Finish every sentence fully. Do not stop mid-sentence.
- Be practical and specific. No disclaimer.

Investor type: ${preferences.investorType}
Assets: ${preferences.assets?.join(', ')}
Content interests: ${contentTypes.join(', ') || 'none specified'}
Prices: ${JSON.stringify(priceSummary)}
Headlines: ${(newsTitles || []).join(' | ') || 'n/a'}${buildPromptExtras(contentTypes)}`;

  let lastError;
  const tokenBudgets = [420, 640, 800];

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const maxTokens = tokenBudgets[attempt];
      const { text, finishReason } = await callOpenRouter({ apiKey, prompt, maxTokens });
      if (!text) {
        throw new Error('Empty insight');
      }
      if (looksIncomplete(text, finishReason)) {
        lastError = new Error(`Incomplete insight (finish_reason=${finishReason || 'n/a'})`);
        if (attempt < 2) {
          await sleep(400 * 2 ** attempt);
          continue;
        }
        throw lastError;
      }
      return {
        id: `insight-${new Date().toISOString().slice(0, 10)}`,
        text,
        provider: 'openrouter',
      };
    } catch (err) {
      lastError = err;
      const status = err.status;
      const retryable =
        !status || status === 429 || status >= 500 || /Empty insight|Incomplete insight/.test(err.message);
      if (!retryable || attempt === 2) break;
      await sleep(700 * 2 ** attempt);
    }
  }

  console.warn('OpenRouter failed, using fallback insight:', lastError?.message || 'unknown');
  return buildFallbackInsight({ preferences, prices });
}

module.exports = { generateInsight };
