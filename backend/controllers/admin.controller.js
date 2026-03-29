// controllers/admin.controller.js
const db = require('../config/db');

// ═══════════════════════════════════════
// 1. DASHBOARD STATS
// ═══════════════════════════════════════
const getStats = async (_req, res) => {
  try {
    const [u]  = await db.query("SELECT COUNT(*) AS total_users FROM users WHERE role='user'");
    const [sk] = await db.query("SELECT COUNT(*) AS total_skills FROM skills");
    const [rq] = await db.query("SELECT COUNT(*) AS total_requests FROM skill_requests");
    const [cp] = await db.query("SELECT COUNT(*) AS completed FROM skill_requests WHERE status='completed'");
    const [dt] = await db.query("SELECT COUNT(*) AS total_disputes FROM disputes");
    const [od] = await db.query("SELECT COUNT(*) AS open_disputes FROM disputes WHERE status='open'");
    const [cr] = await db.query("SELECT COALESCE(SUM(credits),0) AS credits_exchanged FROM credit_transactions WHERE transaction_type='transfer'");

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
      total_users:        parseInt(u[0].total_users),
      total_skills:       parseInt(sk[0].total_skills),
      total_requests:     parseInt(rq[0].total_requests),
      completed:          parseInt(cp[0].completed),
      total_disputes:     parseInt(dt[0].total_disputes),
      open_disputes:      parseInt(od[0].open_disputes),
      credits_exchanged:  parseFloat(cr[0].credits_exchanged).toFixed(2),
      recent_requests,
      recent_disputes,
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
       WHERE (name ILIKE $1 OR email ILIKE $2) AND role = 'user'
       ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
      [like, like, parseInt(limit), parseInt(offset)]
    );
    const [countRows] = await db.query(
      "SELECT COUNT(*) AS total FROM users WHERE (name ILIKE $1 OR email ILIKE $2) AND role='user'",
      [like, like]
    );
    res.json({ users, total: parseInt(countRows[0].total) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const getUserDetail = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, name, email, role, credits, locked_credits, bio,
              trust_score, strike_count, is_blocked, created_at, avatar_url, location, mobile
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const user = rows[0];

    const [skills] = await db.query(
      'SELECT id, skill_name, category, is_active FROM skills WHERE user_id = $1',
      [req.params.id]
    );
    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
              SUM(CASE WHEN status='disputed'  THEN 1 ELSE 0 END) AS disputed
       FROM skill_requests WHERE requester_id = $1 OR provider_id = $2`,
      [req.params.id, req.params.id]
    );
    res.json({ ...user, skills, request_counts: countRows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user detail' });
  }
};

const toggleBlock = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT is_blocked, role FROM users WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    if (rows[0].role === 'admin') return res.status(403).json({ error: 'Cannot block admin' });
    const newState = !rows[0].is_blocked;
    await db.query('UPDATE users SET is_blocked = $1 WHERE id = $2', [newState, req.params.id]);
    res.json({ message: `User ${newState ? 'blocked' : 'unblocked'}`, is_blocked: newState });
  } catch (err) {
    res.status(500).json({ error: 'Action failed' });
  }
};

const manageStrike = async (req, res) => {
  const { action } = req.body;
  try {
    const [rows] = await db.query(
      'SELECT strike_count, trust_score FROM users WHERE id = $1', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const user       = rows[0];
    const newStrikes = action === 'add' ? user.strike_count + 1 : Math.max(0, user.strike_count - 1);
    const newTrust   = action === 'add'
      ? Math.max(0,   parseFloat(user.trust_score) - 10)
      : Math.min(100, parseFloat(user.trust_score) + 10);

    await db.query(
      'UPDATE users SET strike_count = $1, trust_score = $2 WHERE id = $3',
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
    const [rows] = await conn.query('SELECT credits FROM users WHERE id = $1', [req.params.id]);
    if (!rows.length) { await conn.rollback(); return res.status(404).json({ error: 'User not found' }); }

    const newBal = parseFloat(rows[0].credits) + parsed;
    if (newBal < 0) { await conn.rollback(); return res.status(400).json({ error: 'Would result in negative balance' }); }

    await conn.query('UPDATE users SET credits = $1 WHERE id = $2', [newBal, req.params.id]);
    await conn.query(
      `INSERT INTO credit_transactions (from_user, to_user, credits, transaction_type, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        parsed < 0 ? req.params.id : null,
        parsed > 0 ? req.params.id : null,
        Math.abs(parsed),
        parsed > 0 ? 'bonus' : 'spend',
        '[Admin] ' + (reason || 'Credit adjustment'),
      ]
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
    if (status) { where += ` AND d.status = $${params.length + 1}`; params.push(status); }

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
    const [rows] = await conn.query(
      `SELECT d.*, sr.requester_id, sr.provider_id, sr.hours_requested, s.credits_per_hour
       FROM disputes d
       JOIN skill_requests sr ON d.request_id = sr.id
       JOIN skills s          ON sr.skill_id  = s.id
       WHERE d.id = $1 AND d.status = 'open'`,
      [req.params.id]
    );
    if (!rows.length) { await conn.rollback(); return res.status(404).json({ error: 'Open dispute not found' }); }

    const dispute = rows[0];
    const cost = parseFloat(dispute.hours_requested) * parseFloat(dispute.credits_per_hour);

    // Always unlock first
    await conn.query(
      'UPDATE users SET locked_credits = GREATEST(0, locked_credits - $1) WHERE id = $2',
      [cost, dispute.requester_id]
    );

    if (winner === 'provider') {
      await conn.query('UPDATE users SET credits = credits - $1 WHERE id = $2', [cost, dispute.requester_id]);
      await conn.query('UPDATE users SET credits = credits + $1 WHERE id = $2', [cost, dispute.provider_id]);
      await conn.query(
        "INSERT INTO credit_transactions (from_user, to_user, credits, transaction_type, note) VALUES ($1,$2,$3,'transfer','Dispute resolved — credited to provider')",
        [dispute.requester_id, dispute.provider_id, cost]
      );
    } else if (winner === 'requester') {
      await conn.query(
        "INSERT INTO credit_transactions (from_user, to_user, credits, transaction_type, note) VALUES (NULL,$1,$2,'refund','Dispute resolved — refunded to requester')",
        [dispute.requester_id, cost]
      );
    } else {
      const half = cost / 2;
      await conn.query('UPDATE users SET credits = credits - $1 WHERE id = $2', [half, dispute.requester_id]);
      await conn.query('UPDATE users SET credits = credits + $1 WHERE id = $2', [half, dispute.provider_id]);
    }

    if (strike_provider)  await conn.query('UPDATE users SET strike_count=strike_count+1, trust_score=GREATEST(0,trust_score-10) WHERE id=$1', [dispute.provider_id]);
    if (strike_requester) await conn.query('UPDATE users SET strike_count=strike_count+1, trust_score=GREATEST(0,trust_score-10) WHERE id=$1', [dispute.requester_id]);

    await conn.query(
      "UPDATE disputes SET status='resolved', resolution=$1, resolved_by=$2, resolved_at=NOW() WHERE id=$3",
      [resolution || null, req.user.id, req.params.id]
    );
    await conn.query("UPDATE skill_requests SET status='completed' WHERE id=$1", [dispute.request_id]);

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
       FROM skill_requests WHERE created_at >= NOW() - INTERVAL '14 days'
       GROUP BY DATE(created_at) ORDER BY date ASC`
    );
    const [credits_per_day] = await db.query(
      `SELECT DATE(created_at) AS date, SUM(credits) AS total
       FROM credit_transactions WHERE transaction_type='transfer'
         AND created_at >= NOW() - INTERVAL '14 days'
       GROUP BY DATE(created_at) ORDER BY date ASC`
    );
    const [r1] = await db.query('SELECT COUNT(*) AS total_req FROM skill_requests');
    const [r2] = await db.query("SELECT COUNT(*) AS disputed_req FROM skill_requests WHERE status='disputed'");
    const [r3] = await db.query("SELECT COUNT(*) AS completed_req FROM skill_requests WHERE status='completed'");
    const [r4] = await db.query("SELECT COUNT(*) AS total_users FROM users WHERE role='user'");
    const [r5] = await db.query("SELECT COALESCE(SUM(credits),0) AS total_credits FROM credit_transactions WHERE transaction_type='transfer'");
    const [r6] = await db.query("SELECT COUNT(*) AS new_users_week FROM users WHERE created_at >= NOW() - INTERVAL '7 days' AND role='user'");

    const total_req    = parseInt(r1[0].total_req);
    const disputed_req = parseInt(r2[0].disputed_req);
    const completed_req = parseInt(r3[0].completed_req);

    res.json({
      sessions_per_day, credits_per_day,
      total_users:        parseInt(r4[0].total_users),
      total_sessions:     total_req,
      completed_sessions: completed_req,
      disputed_sessions:  disputed_req,
      success_rate: total_req > 0 ? ((completed_req / total_req) * 100).toFixed(1) : 0,
      dispute_rate:  total_req > 0 ? ((disputed_req  / total_req) * 100).toFixed(1) : 0,
      total_credits: parseFloat(r5[0].total_credits).toFixed(2),
      new_users_week: parseInt(r6[0].new_users_week),
    });
  } catch (err) {
    console.error('getAnalytics:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// ═══════════════════════════════════════
// 5. ALL SESSIONS
// ═══════════════════════════════════════
const getAllSessions = async (req, res) => {
  const { status = '', page = 1, limit = 30 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const params = [];
    let where = 'WHERE 1=1';
    if (status) { where += ` AND sr.status = $${params.length + 1}`; params.push(status); }

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
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM skill_requests sr ${where}`,
      params
    );

    res.json({ sessions: rows, total: parseInt(countRows[0].total) });
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
