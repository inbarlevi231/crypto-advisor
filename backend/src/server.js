require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/auth');
const preferencesRoutes = require('./routes/preferences');
const dashboardRoutes = require('./routes/dashboard');
const feedbackRoutes = require('./routes/feedback');

const app = express();
const PORT = process.env.PORT || 4000;

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'https://crypto-advisor-nine.vercel.app',
]
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, ''));

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (no Origin header) and configured frontends
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'crypto-advisor-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/feedback', feedbackRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

async function start() {
  await connectDB();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
