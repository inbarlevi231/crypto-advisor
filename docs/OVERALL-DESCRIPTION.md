# Overall Description — AI Crypto Advisor (SignalDesk)

**Summary.** SignalDesk is a deployed full-stack web app that turns a short onboarding quiz into a personalized daily crypto desk—news, prices, AI insight, and memes—with thumbs up/down feedback collected for future recommendation improvements.

For this assignment, I built **SignalDesk**, a personalized AI-powered crypto investor dashboard. Users sign up and log in with JWT-based authentication (full name, email, and password, including confirm-password on signup and a simple forgot-password reset), then complete a short onboarding quiz about their crypto assets, investor type (e.g. HODLer, Day Trader, NFT Collector), and content interests (Market News, Charts, Social, Fun). Preferences are stored in MongoDB and drive the daily dashboard; they can also be edited later from the app.

The dashboard always presents four sections—Market News, Coin Prices, AI Insight of the Day, and a Fun Crypto Meme—with optional Charts (sparklines), Social information, and Fun Facts when selected. Users can refresh the day’s content and submit thumbs up/down feedback on each section. Live providers are labeled in the UI; when an API is unavailable, the section shows a clear static/fallback state instead of breaking the page.

**Approach and methods.** I started from a written plan aligned with the Moveo brief (auth → onboarding → daily desk → feedback), then implemented a monorepo: React/Vite + React Router on the frontend, Node.js/Express for the backend, and MongoDB Atlas for users, preferences, daily cache, and feedback. Backend routes were built first; the UI was wired next; finally I integrated free-tier APIs and deployed publicly (frontend on Vercel, backend on Render; GitHub: https://github.com/inbarlevi231/crypto-advisor · live app: https://crypto-advisor-nine.vercel.app). For news I used MarketAux instead of CryptoPanic because CryptoPanic’s API is not free for this use case, while MarketAux offers a free tier that still fits the brief’s “Market News + static fallback” requirement.

For reliability and UX I used several concrete methods: client- and server-side validation on auth and preferences; structured auth errors `{ message, code }` (e.g. `EMAIL_EXISTS`, `WEAK_PASSWORD`) so the UI can show specific messages; JWT middleware for protected routes; retries with backoff and short in-memory caching for CoinGecko, MarketAux, and OpenRouter; graceful degradation to static news/prices or a rule-based insight when providers fail; and a per-user daily dashboard cache that is not locked when a section fell back, so the next load can retry live APIs. Preference updates clear cached desks so the next view matches the new quiz answers.

**AI tools.** I started by planning and defining the requirements: I spent the first half-day reviewing the assignment, researching the crypto domain and APIs, and deciding the user flow (auth → onboarding → dashboard → feedback). I used Cursor to help choose the stack (React/Vite, Node/Express, MongoDB) and to implement the project—backend first, then frontend—while I directed product decisions, reviewed suggestions, and tested critical paths myself. I finished by refining UX, fixing production issues (API fallbacks, env/deploy config, layout), and checking for missing functionality.

**Bonus — training suggestion (not implemented).**

1. Store thumbs up/down votes together with the user’s preferences and content details (`userId`, section, itemId, contentSnapshot, vote).
2. Use these votes as labeled training data to understand what each user prefers.
3. Train a lightweight ranker based on features such as assets, investor type, and content type.
4. Use the model to score and rank new content for each user.
5. Show the highest-scoring content first on the daily dashboard.
6. Continue collecting votes and retrain periodically to improve personalization over time (optionally feed strong “up” examples into the insight prompt).

**If I continued:** Building on that training idea, I would next turn feedback into stronger personalization in the live product, improve loading and mobile UX, and add alerts or watchlists so users get notified when their assets move sharply.
