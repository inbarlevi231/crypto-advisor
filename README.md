# SignalDesk — AI Crypto Advisor

Personalized crypto investor dashboard: short onboarding quiz, daily curated sections (news, prices, AI insight, meme), and thumbs up/down feedback for future model improvement.

## Stack

- Frontend: React (Vite) + React Router
- Backend: Node.js + Express
- Database: MongoDB

## Local setup

### Prerequisites

- Node.js 18+
- MongoDB via Docker (`docker run -d --name crypto-advisor-mongo -p 27017:27017 mongo:7`), Atlas URI, or local MongoDB
- `MONGODB_URI=memory` is documented but may fail on Windows without VC++ redistributable — prefer Docker/Atlas

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API defaults to `http://localhost:4000`.

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App defaults to `http://localhost:5173`.

### Environment variables

**Backend (`backend/.env`)**

| Variable | Required | Notes |
|----------|----------|-------|
| `MONGODB_URI` | Yes | e.g. `mongodb://127.0.0.1:27017/crypto-advisor` |
| `JWT_SECRET` | Yes | Long random string |
| `CLIENT_URL` | Yes | Frontend origin for CORS |
| `OPENROUTER_API_KEY` | No | Falls back to rule-based insight |
| `MARKETAUX_API_KEY` | No | Falls back to static news JSON |

**Frontend (`frontend/.env`)**

| Variable | Notes |
|----------|-------|
| `VITE_API_URL` | e.g. `http://localhost:4000/api` |

## Features

1. Register / login (JWT)
2. Onboarding quiz → preferences in MongoDB
3. Daily dashboard: Market News, Coin Prices (CoinGecko), AI Insight (OpenRouter or fallback), Fun Meme
4. Thumbs up/down per section stored as feedback

## API overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET|PUT /api/preferences`
- `GET /api/dashboard?refresh=1`
- `POST /api/feedback`

## Deploy notes (later)

- Frontend: Vercel / Netlify
- Backend: Render / Railway
- DB: MongoDB Atlas

GitHub push and public deploy are intentionally deferred until you ask.

## Bonus — feedback for future model training

Votes are stored as labeled examples: `{ userId, preferences context, section, itemId, contentSnapshot, vote }`.

A practical improvement loop (not implemented here):

1. **Aggregate preferences + votes** into training rows (positive/negative labels per content item and section).
2. **Train a lightweight ranker** (logistic regression / gradient boosting / small neural ranker) that scores candidate news, insights, and memes given user features (assets, investor type, contentTypes).
3. **Online use:** generate candidate content as today, re-rank with the model, serve top-N; keep collecting votes.
4. **Optional LLM path:** use high-confidence preferred examples as few-shot or preference-tuning data for the daily insight prompt.

This keeps the product shippable on free APIs while building a dataset for personalization.

## AI tools usage summary

This project was implemented with Cursor (Composer agent): requirements from the Moveo PDF, plan for React + Express + MongoDB, scaffolded monorepo, auth/onboarding/dashboard/feedback, static API fallbacks, and this README. No GitHub publish in the initial build session.
