// controllers/admin.controller.js
const db = require('../config/db');

// ═══════════════════════════════════════
// 1. DASHBOARD STATS
// ═══════════════════════════════════════
const getStats = async (_req, res) => {
  try {
    const [[{ total_users }]]       = await db.query("SELECT COUNT(*) AS total_users FROM users WHERE role='user'");
    const [[{ total_skills }]]      = await db.query("SELECT COUNT(*) AS total_skills FROM skills");
    const [[{ total_requests }]]    = await db.query("SELECT COUNT(*) AS total_requests FROM skill_requests");
    const [[{ completed }]]         = await db.query("SELECT COUNT(*) AS completed FROM skill_requests WHERE status='completed'");
    const [[{ total_disputes }]]    = await db.query("SELECT COUNT(*) AS total_disputes FROM disputes");
    const [[{ open_disputes }]]     = await db.query("SELECT COUNT(*) AS open_disputes FROM disputes WHERE status='open'");
    const [[{ credits_exchanged }]] = await db.query("SELECT COALESCE(SUM(credits),0) AS credits_exchanged FROM credit_transactions WHERE transaction_type='transfer'");

    const [recent_requests] = await db.query(
      `SELECT sr.id, sr.status, sr.created_at, sr.hours_requested,
              s.skill_name, ru.name AS requester_name, pu.name AS provider_name
       FROM skill_requests sr
       JOIN skills s  ON sr.skill_id     = s.id
       JOIN users  ru ON sr.requester_id = ru.id
       JOIN users  pu ON sr.provider_id  = pu.id
       ORDER BY sr.created_at DESC LIMIT 8`
    );

    const [recent_disputes] = await db.query(
      `SELECT d.id, d.status, d.reason, d.created_at,
              s.skill_name, rb.name AS raised_by_name
       FROM disputes d
       JOIN skill_requests sr ON d.request_id = sr.id
       JOIN skills s          ON sr.skill_id  = s.id
       JOIN users  rb         ON d.raised_by  = rb.id
       ORDER BY d.created_at DESC LIMIT 5`
    );

    res.json({
      total_users, total_skills, total_requests, completed,
      total_disputes, open_disputes,
      credits_exchanged: parseFloat(credits_exchanged).toFixed(2),
      recent_requests, recent_disputes,
    });
  } catch (err) {
    console.error('getStats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// ═══════════════════════════════════════
// 2. USER MANAGEMENT
// ═══════════════════════════════════════
const getAllUsers = async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const like = `%${search}%`;
    const [users] = await db.query(
      `SELECT id, name, email, credits, locked_credits,
              trust_score, strike_count, is_blocked, created_at, avatar_url, location
       FROM users
       WHERE (name LIKE ? OR email LIKE ?) AND role = 'user'
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [like, like, parseInt(limit), parseInt(offset)]
    );
    const [[{ total }]] = await db.query(
      "SELECT COUNT(*) AS total FROM users WHERE (name LIKE ? OR email LIKE ?) AND role='user'",
      [like, like]
    );
    res.json({ users, total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const getUserDetail = async (req, res) => {
  try {
    const [[user]] = await db.query(
      `SELECT id, name, email, role, credits, locked_credits, bio,
              trust_score, strike_count, is_blocked, created_at, avatar_url, location, mobile
       FROM users WHERE id = ?`,
      [req.params.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [skills] = await db.query(
      'SELECT id, skill_name, category, is_active FROM skills WHERE user_id = ?',
      [req.params.id]
    );
    const [[counts]] = await db.query(
      `SELECT COUNT(*) AS total,
              SUM(status='completed') AS completed,
              SUM(status='disputed')  AS disputed
       FROM skill_requests WHERE requester_id = ? OR provider_id = ?`,
      [req.params.id, req.params.id]
    );
    res.json({ ...user, skills, request_counts: counts });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user detail' });
  }
};

const toggleBlock = async (req, res) => {
  try {
    const [[user]] = await db.query('SELECT is_blocked, role FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Cannot block admin' });
    const newState = !user.is_blocked;
    await db.query('UPDATE users SET is_blocked = ? WHERE id = ?', [newState, req.params.id]);
    res.json({ message: `User ${newState ? 'blocked' : 'unblocked'}`, is_blocked: newState });
  } catch (err) {
    res.status(500).json({ error: 'Action failed' });
  }
};

const manageStrike = async (req, res) => {
  const { action } = req.body;
  try {
    const [[user]] = await db.query(
      'SELECT strike_count, trust_score FROM users WHERE id = ?', [req.params.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newStrikes = action === 'add' ? user.strike_count + 1 : Math.max(0, user.strike_count - 1);
    const newTrust   = action === 'add'
      ? Math.max(0,   parseFloat(user.trust_score) - 10)
      : Math.min(100, parseFloat(user.trust_score) + 10);

    await db.query(
      'UPDATE users SET strike_count = ?, trust_score = ? WHERE id = ?',
      [newStrikes, newTrust, req.params.id]
    );
    res.json({ message: `Strike ${action === 'add' ? 'added' : 'removed'}`, strike_count: newStrikes, trust_score: newTrust });
  } catch (err) {
    res.status(500).json({ error: 'Action failed' });
  }
};

const adjustCredits = async (req, res) => {
  const { amount, reason } = req.body;
  const parsed = parseFloat(amount);
  if (isNaN(parsed)) return res.status(400).json({ error: 'Invalid amount' });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[user]] = await conn.query('SELECT credits FROM users WHERE id = ?', [req.params.id]);
    if (!user) { await conn.rollback(); return res.status(404).json({ error: 'User not found' }); }

    const newBal = parseFloat(user.credits) + parsed;
    if (newBal < 0) { await conn.rollback(); return res.status(400).json({ error: 'Would result in negative balance' }); }

    await conn.query('UPDATE users SET credits = ? WHERE id = ?', [newBal, req.params.id]);
    await conn.query(
      `INSERT INTO credit_transactions (from_user, to_user, credits, transaction_type, note)
       VALUES (?, ?, ?, ?, ?)`,
      [parsed < 0 ? req.params.id : null, parsed > 0 ? req.params.id : null, Math.abs(parsed), parsed > 0 ? 'bonus' : 'spend', '[Admin] ' + (reason || 'Credit adjustment')]
    );
    await conn.commit();
    res.json({ message: 'Credits adjusted', new_balance: newBal });
  } catch (err) {
    await conn.rollback();
    console.error('adjustCredits error:', err.message);
    res.status(500).json({ error: err.message || 'Adjustment failed' });
  } finally {
    conn.release();
  }
};

// ═══════════════════════════════════════
// 3. DISPUTE MANAGEMENT
// ═══════════════════════════════════════
const getDisputes = async (req, res) => {
  const { status = '' } = req.query;
  try {
    const params = [];
    let where = 'WHERE 1=1';
    if (status) { where += ' AND d.status = ?'; params.push(status); }

    const [rows] = await db.query(
      `SELECT d.*,
              rb.name AS raised_by_name,
              pu.name AS provider_name,  pu.trust_score AS provider_trust,  pu.strike_count AS provider_strikes,
              ru.name AS requester_name, ru.trust_score AS requester_trust, ru.strike_count AS requester_strikes,
              sr.hours_requested, sr.provider_confirmed, sr.requester_confirmed, sr.status AS request_status,
              s.skill_name, s.credits_per_hour
       FROM disputes d
       JOIN skill_requests sr ON d.request_id  = sr.id
       JOIN skills s          ON sr.skill_id   = s.id
       JOIN users  rb         ON d.raised_by   = rb.id
       JOIN users  pu         ON sr.provider_id  = pu.id
       JOIN users  ru         ON sr.requester_id = ru.id
       ${where} ORDER BY d.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('getDisputes:', err);
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
};

const resolveDispute = async (req, res) => {
  const { winner, resolution, strike_provider, strike_requester } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[dispute]] = await conn.query(
      `SELECT d.*, sr.requester_id, sr.provider_id, sr.hours_requested, s.credits_per_hour
       FROM disputes d
       JOIN skill_requests sr ON d.request_id = sr.id
       JOIN skills s          ON sr.skill_id  = s.id
       WHERE d.id = ? AND d.status = 'open'`,
      [req.params.id]
    );
    if (!dispute) { await conn.rollback(); return res.status(404).json({ error: 'Open dispute not found' }); }

    const cost = parseFloat(dispute.hours_requested) * parseFloat(dispute.credits_per_hour);

    // Always unlock first
    await conn.query(
      'UPDATE users SET locked_credits = GREATEST(0, locked_credits - ?) WHERE id = ?',
      [cost, dispute.requester_id]
    );

    if (winner === 'provider') {
      await conn.query('UPDATE users SET credits = credits - ? WHERE id = ?', [cost, dispute.requester_id]);
      await conn.query('UPDATE users SET credits = credits + ? WHERE id = ?', [cost, dispute.provider_id]);
      await conn.query(
        "INSERT INTO credit_transactions (from_user, to_user, credits, transaction_type, note) VALUES (?,?,?,'transfer','Dispute resolved — credited to provider')",
        [dispute.requester_id, dispute.provider_id, cost]
      );
    } else if (winner === 'requester') {
      await conn.query(
        "INSERT INTO credit_transactions (from_user, to_user, credits, transaction_type, note) VALUES (NULL,?,?,'refund','Dispute resolved — refunded to requester')",
        [dispute.requester_id, cost]
      );
    } else {
      const half = cost / 2;
      await conn.query('UPDATE users SET credits = credits - ? WHERE id = ?', [half, dispute.requester_id]);
      await conn.query('UPDATE users SET credits = credits + ? WHERE id = ?', [half, dispute.provider_id]);
    }

    if (strike_provider)  await conn.query('UPDATE users SET strike_count=strike_count+1, trust_score=GREATEST(0,trust_score-10) WHERE id=?', [dispute.provider_id]);
    if (strike_requester) await conn.query('UPDATE users SET strike_count=strike_count+1, trust_score=GREATEST(0,trust_score-10) WHERE id=?', [dispute.requester_id]);

    await conn.query(
      "UPDATE disputes SET status='resolved', resolution=?, resolved_by=?, resolved_at=NOW() WHERE id=?",
      [resolution || null, req.user.id, req.params.id]
    );
    await conn.query("UPDATE skill_requests SET status='completed' WHERE id=?", [dispute.request_id]);

    await conn.commit();
    res.json({ message: 'Dispute resolved successfully' });
  } catch (err) {
    await conn.rollback();
    console.error('resolveDispute:', err);
    res.status(500).json({ error: 'Resolution failed' });
  } finally {
    conn.release();
  }
};

// ═══════════════════════════════════════
// 4. ANALYTICS
// ═══════════════════════════════════════
const getAnalytics = async (_req, res) => {
  try {
    const [sessions_per_day] = await db.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM skill_requests WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
       GROUP BY DATE(created_at) ORDER BY date ASC`
    );
    const [credits_per_day] = await db.query(
      `SELECT DATE(created_at) AS date, SUM(credits) AS total
       FROM credit_transactions WHERE transaction_type='transfer'
         AND created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
       GROUP BY DATE(created_at) ORDER BY date ASC`
    );
    const [[{ total_req }]]      = await db.query('SELECT COUNT(*) AS total_req FROM skill_requests');
    const [[{ disputed_req2 }]]  = await db.query("SELECT COUNT(*) AS disputed_req2 FROM skill_requests WHERE status='disputed'");
    const [[{ completed_req }]]  = await db.query("SELECT COUNT(*) AS completed_req FROM skill_requests WHERE status='completed'");
    const [[{ disputed_req }]]   = await db.query("SELECT COUNT(*) AS disputed_req FROM skill_requests WHERE status='disputed'");
    const [[{ total_users }]]    = await db.query("SELECT COUNT(*) AS total_users FROM users WHERE role='user'");
    const [[{ total_credits }]]  = await db.query("SELECT COALESCE(SUM(credits),0) AS total_credits FROM credit_transactions WHERE transaction_type='transfer'");
    const [[{ new_users_week }]] = await db.query("SELECT COUNT(*) AS new_users_week FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND role='user'");

    res.json({
      sessions_per_day, credits_per_day,
      total_users, total_sessions: parseInt(total_req),
      completed_sessions: parseInt(completed_req),
      disputed_sessions: parseInt(disputed_req2 || disputed_req || 0),
      success_rate: total_req > 0 ? ((completed_req / total_req) * 100).toFixed(1) : 0,
      dispute_rate:  total_req > 0 ? ((disputed_req  / total_req) * 100).toFixed(1) : 0,
      total_credits: parseFloat(total_credits).toFixed(2),
      new_users_week,
    });
  } catch (err) {
    console.error('getAnalytics:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// ═══════════════════════════════════════
// 5. ALL SESSIONS (for admin sessions page)
// ═══════════════════════════════════════
const getAllSessions = async (req, res) => {
  const { status = '', page = 1, limit = 30 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const params = [];
    let where = 'WHERE 1=1';
    if (status) { where += ' AND sr.status = ?'; params.push(status); }

    const [rows] = await db.query(
      `SELECT sr.id, sr.status, sr.hours_requested, sr.created_at,
              sr.provider_confirmed, sr.requester_confirmed,
              sr.confirmation_deadline,
              s.skill_name, s.credits_per_hour,
              ru.name AS requester_name, ru.id AS requester_id,
              pu.name AS provider_name,  pu.id AS provider_id,
              (sr.hours_requested * s.credits_per_hour) AS total_credits
       FROM skill_requests sr
       JOIN skills s  ON sr.skill_id     = s.id
       JOIN users  ru ON sr.requester_id = ru.id
       JOIN users  pu ON sr.provider_id  = pu.id
       ${where}
       ORDER BY sr.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM skill_requests sr ${where}`,
      params
    );

    res.json({ sessions: rows, total });
  } catch (err) {
    console.error('getAllSessions:', err.message);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

const getAllRequests = async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT sr.*, s.skill_name, ru.name AS requester_name, pu.name AS provider_name
       FROM skill_requests sr
       JOIN skills s  ON sr.skill_id     = s.id
       JOIN users  ru ON sr.requester_id = ru.id
       JOIN users  pu ON sr.provider_id  = pu.id
       ORDER BY sr.created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

module.exports = {
  getStats, getAllUsers, getUserDetail, toggleBlock, manageStrike,
  adjustCredits, getDisputes, resolveDispute, getAnalytics, getAllRequests,
  getAllSessions,
};
