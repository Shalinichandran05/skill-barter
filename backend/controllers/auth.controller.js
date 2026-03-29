// controllers/auth.controller.js
// Handles user registration, login, profile fetch and update.

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

// ── Helpers ────────────────────────────────────────────────

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ── Register ───────────────────────────────────────────────
const register = async (req, res) => {
  const { name, email, password, bio, mobile, location, avatar_url } = req.body;

  try {
    // Duplicate email check
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ?', [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password (salt rounds = 10)
    const hashed = await bcrypt.hash(password, 10);

    // Insert new user with all profile fields
    const [result] = await db.query(
      `INSERT INTO users (name, email, password, bio, mobile, location, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hashed, bio || null, mobile || null, location || null, avatar_url || null]
    );

    // Record welcome bonus transaction
    await db.query(
      `INSERT INTO credit_transactions
         (from_user, to_user, credits, transaction_type, note)
       VALUES (NULL, ?, 5.00, 'bonus', 'Welcome bonus')`,
      [result.insertId]
    );

    const token = signToken({ id: result.insertId, email, role: 'user' });

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: result.insertId, name, email, role: 'user', credits: 5,
        bio: bio || null, mobile: mobile || null,
        location: location || null, avatar_url: avatar_url || null,
      },
    });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// ── Login ──────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query(
      `SELECT id, name, email, password, role, credits, locked_credits,
              bio, mobile, location, avatar_url, is_blocked
       FROM users WHERE email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];

    if (user.is_blocked) {
      return res.status(403).json({ error: 'Your account has been blocked' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    // Never send hashed password to client
    delete user.password;

    res.json({ token, user });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// ── Get Current User ───────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, role, credits, locked_credits,
              bio, mobile, location, avatar_url, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// ── Update Profile ─────────────────────────────────────────
const updateProfile = async (req, res) => {
  const { name, bio, avatar_url, mobile, location } = req.body;

  try {
    await db.query(
      `UPDATE users SET name = ?, bio = ?, avatar_url = ?, mobile = ?, location = ?
       WHERE id = ?`,
      [name, bio || null, avatar_url || null, mobile || null, location || null, req.user.id]
    );

    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
};

module.exports = { register, login, getMe, updateProfile };
