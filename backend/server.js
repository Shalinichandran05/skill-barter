// server.js – SkillBarter API entry point

require('dotenv').config();
const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');

// Route modules
const authRoutes        = require('./routes/auth.routes');
const skillRoutes       = require('./routes/skill.routes');
const requestRoutes     = require('./routes/request.routes');
const creditRoutes      = require('./routes/credit.routes');
const ratingRoutes      = require('./routes/rating.routes');
const adminRoutes       = require('./routes/admin.routes');
const userRoutes        = require('./routes/user.routes');
const messageRoutes     = require('./routes/message.routes');

const app    = express();
const server = http.createServer(app);  // wrap express in http server for socket.io
const PORT   = process.env.PORT || 5000;

// ── Socket.io setup ──────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:      process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Attach io to app so controllers can emit events
app.set('io', io);

// Socket.io auth middleware — verify JWT on connection
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.userId;
  console.log(`🔌  Socket connected: user ${userId}`);

  // Join personal room — used to send messages to specific user
  socket.join(`user_${userId}`);

  socket.on('disconnect', () => {
    console.log(`🔌  Socket disconnected: user ${userId}`);
  });
});

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

// ── Auto-dispute expired confirmations ───────────────────
const { checkExpiredConfirmations } = require('./controllers/request.controller');
setInterval(checkExpiredConfirmations, 10 * 60 * 1000);
checkExpiredConfirmations();

// Use server.listen instead of app.listen (required for socket.io)
server.listen(PORT, () => {
  console.log(`🚀  SkillBarter API running on http://localhost:${PORT}`);
});
