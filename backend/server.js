// server.js – SkillBarter API entry point (Vercel Serverless Compatible)

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

// Route modules
const authRoutes        = require('./routes/auth.routes');
const skillRoutes       = require('./routes/skill.routes');
const requestRoutes     = require('./routes/request.routes');
const creditRoutes      = require('./routes/credit.routes');
const ratingRoutes      = require('./routes/rating.routes');
const adminRoutes       = require('./routes/admin.routes');
const userRoutes        = require('./routes/user.routes');
const messageRoutes     = require('./routes/message.routes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Global Middleware ────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      1000,
  message:  { error: 'Too many requests. Please try again later.' },
}));

// ── Health Check ─────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Public stats (landing page, no auth needed) ─────────
app.get('/api/public/stats', async (_req, res) => {
  try {
    const db = require('./config/db');
    const [[{ skills }]]   = await db.query('SELECT COUNT(*) AS skills FROM skills WHERE is_active = TRUE');
    const [[{ sessions }]] = await db.query("SELECT COUNT(*) AS sessions FROM skill_requests WHERE status = 'completed'");
    res.json({ skills: parseInt(skills), sessions: parseInt(sessions) });
  } catch (_) {
    res.json({ skills: 0, sessions: 0 });
  }
});

// ── Scheduled Cron Endpoint (Vercel Cron) ────────────────
const { checkExpiredConfirmations } = require('./controllers/request.controller');
app.get('/api/cron', async (req, res) => {
  // If authorization header is set via Vercel Cron, you can verify it here.
  // For now, we just execute the expired checks.
  await checkExpiredConfirmations();
  res.json({ status: 'ran auto-dispute checks' });
});

// ── API Routes ───────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/skills',   skillRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/credits',  creditRoutes);
app.use('/api/ratings',  ratingRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/messages', messageRoutes);

// ── 404 ──────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global Error Handler ─────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// For Vercel Serverless, we export the app instance.
module.exports = app;

// During local development, listen on PORT
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀  SkillBarter API (Serverless Mode) running on http://localhost:${PORT}`);
  });
}
