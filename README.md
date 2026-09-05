# SignalDesk — AI Crypto Advisor

Personalized crypto investor dashboard: short onboarding quiz, daily curated sections (news, prices, AI insight, meme), optional Social / Fun / Charts extras, and thumbs up/down feedback.

## Live demo

| Layer | URL |
|-------|-----|
| Frontend | https://crypto-advisor-nine.vercel.app |
| Backend API | https://crypto-advisor-api-om7f.onrender.com |
| Repo | https://github.com/inbarlevi231/crypto-advisor |

## Stack

- **Frontend:** React (Vite) + React Router
- **Backend:** Node.js + Express
- **Database:** MongoDB Atlas
- **Deploy:** Vercel (frontend) + Render (backend)

## Features

1. **Auth** — register / login with full name (first + last), email, password; JWT sessions
2. **Signup UX** — confirm password; password tooltip (min 6 characters); clear structured error codes
3. **Forgot password** — reset with email + full name + new password (no email sending); new-password tooltip
4. **Onboarding** — assets, investor type, content types → saved as preferences; editable later from the dashboard
5. **Daily dashboard** (two stacked columns: News → Insight | Prices → Meme):
   - **Market News** — MarketAux (static JSON fallback)
   - **Coin Prices** — CoinGecko (static fallback on failure)
   - **AI Insight** — OpenRouter (rule-based fallback)
   - **Fun Crypto Meme** — static local images
6. **Preference extras** (only when selected):
   - **Charts** — CoinGecko 7-day sparklines under each price
   - **Social** — static social-buzz blurb under the insight
   - **Fun** — static fun fact under the meme
7. **Refresh** — force rebuild of today’s desk (`?refresh=1`)
8. **Feedback** — thumbs up/down per section, stored in MongoDB

## Local setup

### Prerequisites

- Node.js 18+
- MongoDB (Docker, local, or Atlas URI)

```bash
# Optional local MongoDB via Docker
docker run -d --name crypto-advisor-mongo -p 27017:27017 mongo:7
```

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
| `MONGODB_URI` | Yes | Atlas or local Mongo URI |
| `JWT_SECRET` | Yes | Long random string |
| `CLIENT_URL` | Yes | Frontend origin for CORS (local `http://localhost:5173` or Vercel URL) |
| `OPENROUTER_API_KEY` | Recommended | Without it, AI insight uses rule-based fallback |
| `OPENROUTER_MODEL` | No | Default `openai/gpt-4o-mini` |
| `MARKETAUX_API_KEY` | Recommended | Without it, news uses static JSON |
| `COINGECKO_API_KEY` | Recommended | Free Demo key; reduces rate-limit fallbacks on cloud hosts |
| `COINGECKO_PRO` | No | `true` only for paid CoinGecko Pro (`pro-api.coingecko.com`) |
| `PORT` | No | Default `4000` |

**Frontend (`frontend/.env`)**

| Variable | Notes |
|----------|-------|
| `VITE_API_URL` | Local: `http://localhost:4000/api` · Prod: `https://crypto-advisor-api-om7f.onrender.com/api` |

## API overview

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/auth/register` | Full name, email, password |
| `POST` | `/api/auth/login` | Email + password (name checked when provided) |
| `POST` | `/api/auth/reset-password` | Email + full name + new password |
| `GET` | `/api/auth/me` | Current user (JWT) |
| `GET` / `PUT` | `/api/preferences` | Onboarding answers |
| `GET` | `/api/dashboard?refresh=1` | Daily desk; `refresh=1` bypasses cache |
| `POST` / `GET` | `/api/feedback` | Section votes |

Auth errors return `{ message, code }` (e.g. `EMAIL_EXISTS`, `WEAK_PASSWORD`, `PASSWORD_MISMATCH`).

## Data providers & fallbacks

| Section | Live source | Fallback |
|---------|-------------|----------|
| News | MarketAux | `backend/data/news-fallback.json` |
| Prices / charts | CoinGecko | Static prices + synthetic sparklines |
| Insight | OpenRouter | Deterministic text from preferences + prices |
| Social buzz | — | `backend/data/social-buzz.json` (by design) |
| Fun fact / meme | — | `fun-facts.json` / `memes.json` (by design) |

Live providers use short in-memory caching and retries. Dashboard daily cache is **not** locked when prices/news/insight fell back, so the next load can retry the APIs.

## Deploy

- **Frontend (Vercel):** set `VITE_API_URL` to the Render API `/api` URL
- **Backend (Render):** set all backend env vars; `CLIENT_URL` must be the Vercel origin
- **MongoDB Atlas:** allow network access from Render (e.g. `0.0.0.0/0` for simple demos)
