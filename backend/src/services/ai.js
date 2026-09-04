const { pickSocialBuzz } = require('./social');
const { pickFunFact } = require('./memes');

function buildFallbackExtras(preferences) {
  const contentTypes = preferences.contentTypes || [];
  const assets = preferences.assets || [];
  const dateKey = new Date().toISOString().slice(0, 10);
  const extras = { social: null, funFact: null };

  if (contentTypes.includes('Social')) {
    const social = pickSocialBuzz(assets);
    extras.social = {
      id: social.id || `social-${dateKey}`,
      text: social.text,
      provider: 'fallback',
    };
  }
  if (contentTypes.includes('Fun')) {
    const funFact = pickFunFact(Date.now());
    extras.funFact = {
      id: funFact.id || `fun-${dateKey}`,
      text: funFact.text,
      provider: 'fallback',
    };
  }
  return extras;
}

function buildFallbackInsight({ preferences, prices }) {
  const contentTypes = preferences.contentTypes || [];
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

  const extras = buildFallbackExtras(preferences);

  return {
    id: `fallback-insight-${new Date().toISOString().slice(0, 10)}`,
    text: `As a ${preferences.investorType} interested in ${assets}: ${priceBit} ${style}`,
    provider: 'fallback',
    social: extras.social,
    funFact: extras.funFact,
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

function looksIncomplete(text, finishReason) {
  if (!text || text.length < 40) return true;
  if (finishReason === 'length') return true;
  if (/[,:;]\s*$/.test(text)) return true;
  if (/\b(and|or|with|for|to|the|a|an)\s*$/i.test(text)) return true;
  if (!/[.!?]"?$/.test(text)) return true;
  if (/\s[A-Za-z]{1,3}$/.test(text)) return true;
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseInsightPayload(rawText, { wantsSocial, wantsFun }) {
  const cleaned = String(rawText || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        parsed = null;
      }
    }
  }

  if (parsed && typeof parsed === 'object') {
    const insight = String(parsed.insight || parsed.text || '').trim();
    const socialText = String(parsed.social || '').trim();
    const funText = String(parsed.funFact || parsed.fun_fact || '').trim();
    return {
      insight,
      social: wantsSocial && socialText ? socialText : null,
      funFact: wantsFun && funText ? funText : null,
    };
  }

  // Plain-text response: treat whole body as insight only.
  return {
    insight: cleaned,
    social: null,
    funFact: null,
  };
}

async function callOpenRouter({ apiKey, prompt, maxTokens, system }) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:5173',
      'X-Title': 'AI Crypto Advisor',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
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

function attachExtras(base, preferences, { socialText, funFactText, provider }) {
  const contentTypes = preferences.contentTypes || [];
  const dateKey = new Date().toISOString().slice(0, 10);
  const fallbackExtras = buildFallbackExtras(preferences);
  const result = { ...base, social: null, funFact: null };

  if (contentTypes.includes('Social')) {
    result.social = socialText
      ? { id: `social-${dateKey}`, text: socialText, provider }
      : fallbackExtras.social;
  }
  if (contentTypes.includes('Fun')) {
    result.funFact = funFactText
      ? { id: `fun-${dateKey}`, text: funFactText, provider }
      : fallbackExtras.funFact;
  }
  return result;
}

async function generateInsight({ preferences, prices, newsTitles }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('OPENROUTER_API_KEY missing; using fallback insight');
    return buildFallbackInsight({ preferences, prices });
  }

  const contentTypes = preferences.contentTypes || [];
  const wantsSocial = contentTypes.includes('Social');
  const wantsFun = contentTypes.includes('Fun');
  const priceSummary = summarizePrices(prices);

  const extraFields = [];
  if (wantsSocial) {
    extraFields.push('"social": "..."');
  }
  if (wantsFun) {
    extraFields.push('"funFact": "..."');
  }

  const jsonShape = wantsSocial || wantsFun
    ? `{ "insight": "two complete sentences...", ${extraFields.join(', ')} }`
    : `{ "insight": "two complete sentences..." }`;

  const extrasInstructions = [];
  if (wantsSocial) {
    extrasInstructions.push(
      'Include "social": one complete sentence on community/social sentiment for their assets.'
    );
  }
  if (wantsFun) {
    extrasInstructions.push(
      'Include "funFact": one short entertaining crypto fun fact related to their assets or investor type when possible.'
    );
  }

  const prompt = `Return ONLY valid JSON (no markdown) in this shape:
${jsonShape}

Rules for insight:
- Exactly 2 complete sentences.
- Mention EVERY listed asset by symbol and its 24h % change.
- Finish every sentence fully. Be practical and specific. No disclaimer.
${extrasInstructions.length ? `\nExtra fields:\n- ${extrasInstructions.join('\n- ')}` : ''}

Investor type: ${preferences.investorType}
Assets: ${preferences.assets?.join(', ')}
Content interests: ${contentTypes.join(', ') || 'none specified'}
Prices: ${JSON.stringify(priceSummary)}
Headlines: ${(newsTitles || []).join(' | ') || 'n/a'}`;

  const system =
    'You are a crypto advisor API. Reply with JSON only. Always finish sentences. Always include each asset 24h move in insight when prices are provided.';

  let lastError;
  const tokenBudgets = [500, 720, 900];

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const maxTokens = tokenBudgets[attempt];
      const { text, finishReason } = await callOpenRouter({ apiKey, prompt, maxTokens, system });
      if (!text) {
        throw new Error('Empty insight');
      }

      const parsed = parseInsightPayload(text, { wantsSocial, wantsFun });
      if (!parsed.insight || looksIncomplete(parsed.insight, finishReason === 'length' ? 'length' : 'stop')) {
        lastError = new Error(`Incomplete insight (finish_reason=${finishReason || 'n/a'})`);
        if (attempt < 2) {
          await sleep(400 * 2 ** attempt);
          continue;
        }
        throw lastError;
      }

      if (wantsSocial && !parsed.social) {
        lastError = new Error('Missing social field');
        if (attempt < 2) {
          await sleep(400 * 2 ** attempt);
          continue;
        }
      }
      if (wantsFun && !parsed.funFact) {
        lastError = new Error('Missing funFact field');
        if (attempt < 2) {
          await sleep(400 * 2 ** attempt);
          continue;
        }
      }

      return attachExtras(
        {
          id: `insight-${new Date().toISOString().slice(0, 10)}`,
          text: parsed.insight,
          provider: 'openrouter',
        },
        preferences,
        {
          socialText: parsed.social,
          funFactText: parsed.funFact,
          provider: 'openrouter',
        }
      );
    } catch (err) {
      lastError = err;
      const status = err.status;
      const retryable =
        !status ||
        status === 429 ||
        status >= 500 ||
        /Empty insight|Incomplete insight|Missing social|Missing funFact/.test(err.message);
      if (!retryable || attempt === 2) break;
      await sleep(700 * 2 ** attempt);
    }
  }

  console.warn('OpenRouter failed, using fallback insight:', lastError?.message || 'unknown');
  return buildFallbackInsight({ preferences, prices });
}

module.exports = { generateInsight };
