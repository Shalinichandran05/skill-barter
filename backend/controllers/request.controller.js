// controllers/request.controller.js
// Full request lifecycle including credit lock/transfer logic

const db = require('../config/db');

// ── Create Request ─────────────────────────────────────────
const createRequest = async (req, res) => {
  const { skill_id, hours_requested, message } = req.body;
  const requester_id = req.user.id;

  try {
    const [skills] = await db.query(
      'SELECT * FROM skills WHERE id = $1 AND is_active = TRUE', [skill_id]
    );
    if (!skills.length) return res.status(404).json({ error: 'Skill not found' });

    const skill = skills[0];

    if (skill.user_id === requester_id) {
      return res.status(400).json({ error: 'Cannot request your own skill' });
    }

    const totalCost = parseFloat(hours_requested) * parseFloat(skill.credits_per_hour);
    const [users]   = await db.query('SELECT credits, locked_credits FROM users WHERE id = $1', [requester_id]);
    const available = parseFloat(users[0].credits) - parseFloat(users[0].locked_credits || 0);

    if (available < totalCost) {
      return res.status(400).json({ error: `Insufficient credits. Need ${totalCost}, have ${available}` });
    }

    const [rows] = await db.query(
      `INSERT INTO skill_requests
         (skill_id, requester_id, provider_id, hours_requested, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [skill_id, requester_id, skill.user_id, hours_requested, message]
    );

    res.status(201).json({ message: 'Request sent', id: rows[0].id });
  } catch (err) {
    console.error('createRequest error:', err);
    res.status(500).json({ error: 'Failed to create request' });
  }
};

// ── Get My Requests (as requester) ────────────────────────
const getMyRequests = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT sr.*, s.skill_name, s.category, s.credits_per_hour,
              u.name AS provider_name, u.avatar_url AS provider_avatar
       FROM skill_requests sr
       JOIN skills s ON sr.skill_id = s.id
       JOIN users  u ON sr.provider_id = u.id
       WHERE sr.requester_id = $1
       ORDER BY sr.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
};

// ── Get Incoming Requests (as provider) ───────────────────
const getIncomingRequests = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT sr.*, s.skill_name, s.category, s.credits_per_hour,
              u.name AS requester_name, u.avatar_url AS requester_avatar
       FROM skill_requests sr
       JOIN skills s ON sr.skill_id = s.id
       JOIN users  u ON sr.requester_id = u.id
       WHERE sr.provider_id = $1
       ORDER BY sr.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch incoming requests' });
  }
};

// ── Approve or Reject (provider action) ───────────────────
const respondToRequest = async (req, res) => {
  const { action } = req.body;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [reqRows] = await conn.query(
      `SELECT sr.*, s.credits_per_hour FROM skill_requests sr
       JOIN skills s ON sr.skill_id = s.id
       WHERE sr.id = $1 AND sr.provider_id = $2 AND sr.status = 'pending'`,
      [req.params.id, req.user.id]
    );

    const request = reqRows[0];
    if (!request) {
      await conn.rollback();
      return res.status(404).json({ error: 'Request not found or already processed' });
    }

    if (action === 'approve') {
      const cost = parseFloat(request.hours_requested) * parseFloat(request.credits_per_hour);

      await conn.query(
        'UPDATE users SET locked_credits = locked_credits + $1 WHERE id = $2',
        [cost, request.requester_id]
      );

      await conn.query(
        `INSERT INTO credit_transactions
           (from_user, to_user, credits, transaction_type, reference_id, note)
         VALUES ($1, NULL, $2, 'lock', $3, 'Credits locked for session')`,
        [request.requester_id, cost, request.id]
      );

      await conn.query(
        `UPDATE skill_requests
         SET status = 'approved',
             confirmation_deadline = NOW() + INTERVAL '2 hours'
         WHERE id = $1`,
        [request.id]
      );

    } else {
      await conn.query(
        "UPDATE skill_requests SET status = 'rejected' WHERE id = $1",
        [request.id]
      );
    }

    await conn.commit();
    res.json({ message: `Request ${action}d` });
  } catch (err) {
    await conn.rollback();
    console.error('respondToRequest error:', err);
    res.status(500).json({ error: 'Action failed' });
  } finally {
    conn.release();
  }
};

// ── Dual Confirmation ──────────────────────────────────────
const confirmSession = async (req, res) => {
  const { confirmed } = req.body;
  const userId = req.user.id;
  const conn   = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [reqRows] = await conn.query(
      `SELECT sr.*, s.credits_per_hour FROM skill_requests sr
       JOIN skills s ON sr.skill_id = s.id
       WHERE sr.id = $1 AND sr.status IN ('approved', 'waiting_confirmation')`,
      [req.params.id]
    );

    const request = reqRows[0];
    if (!request) {
      await conn.rollback();
      return res.status(404).json({ error: 'Request not found or not in approved state' });
    }

    const isProvider  = userId === request.provider_id;
    const isRequester = userId === request.requester_id;

    if (!isProvider && !isRequester) {
      await conn.rollback();
      return res.status(403).json({ error: 'Not a participant' });
    }

    // Check if deadline has passed
    const now      = new Date();
    const deadline = new Date(request.confirmation_deadline);

    if (now > deadline) {
      await conn.query(
        "UPDATE skill_requests SET status = 'disputed' WHERE id = $1",
        [request.id]
      );
      await conn.query(
        `INSERT INTO disputes (request_id, raised_by, reason)
         VALUES ($1, $2, 'Confirmation window expired – no mutual confirmation received')`,
        [request.id, userId]
      );
      await conn.commit();
      return res.status(400).json({ error: 'Confirmation window has expired. A dispute has been raised.' });
    }

    // Record this person's confirmation
    const field = isProvider ? 'provider_confirmed' : 'requester_confirmed';
    await conn.query(
      `UPDATE skill_requests SET ${field} = $1, status = 'waiting_confirmation' WHERE id = $2`,
      [confirmed, request.id]
    );

    // Re-fetch updated state
    const [updRows] = await conn.query(
      'SELECT * FROM skill_requests WHERE id = $1', [request.id]
    );
    const updated = updRows[0];

    const cost = parseFloat(request.hours_requested) * parseFloat(request.credits_per_hour);
    const providerConfirmed  = updated.provider_confirmed;
    const requesterConfirmed = updated.requester_confirmed;
    const bothResponded = providerConfirmed !== null && requesterConfirmed !== null;

    if (bothResponded) {
      if (providerConfirmed && requesterConfirmed) {
        // Both confirmed → transfer credits
        await conn.query(
          `UPDATE users SET credits = credits - $1, locked_credits = locked_credits - $1 WHERE id = $2`,
          [cost, request.requester_id]
        );
        await conn.query(
          'UPDATE users SET credits = credits + $1 WHERE id = $2',
          [cost, request.provider_id]
        );
        await conn.query(
          `INSERT INTO credit_transactions
             (from_user, to_user, credits, transaction_type, reference_id, note)
           VALUES ($1, $2, $3, 'transfer', $4, 'Session completed')`,
          [request.requester_id, request.provider_id, cost, request.id]
        );
        await conn.query(
          "UPDATE skill_requests SET status = 'completed' WHERE id = $1",
          [request.id]
        );

      } else if (!providerConfirmed && !requesterConfirmed) {
        // Both rejected → cancel and unlock
        await conn.query(
          'UPDATE users SET locked_credits = locked_credits - $1 WHERE id = $2',
          [cost, request.requester_id]
        );
        await conn.query(
          `INSERT INTO credit_transactions
             (from_user, to_user, credits, transaction_type, reference_id, note)
           VALUES (NULL, $1, $2, 'unlock', $3, 'Session cancelled by both parties')`,
          [request.requester_id, cost, request.id]
        );
        await conn.query(
          "UPDATE skill_requests SET status = 'cancelled' WHERE id = $1",
          [request.id]
        );

      } else {
        // One confirmed, one rejected → dispute
        await conn.query(
          "UPDATE skill_requests SET status = 'disputed' WHERE id = $1",
          [request.id]
        );
        await conn.query(
          `INSERT INTO disputes (request_id, raised_by, reason)
           VALUES ($1, $2, 'Confirmation mismatch – parties disagreed on session outcome')`,
          [request.id, userId]
        );
      }
    }

    await conn.commit();

    if (!bothResponded) {
      res.json({ message: 'Your response recorded. Waiting for the other party to confirm.' });
    } else {
      res.json({ message: 'Session finalised.' });
    }

  } catch (err) {
    await conn.rollback();
    console.error('confirmSession error:', err);
    res.status(500).json({ error: 'Confirmation failed' });
  } finally {
    conn.release();
  }
};

// ── Auto-dispute expired confirmations ─────────────────────
const checkExpiredConfirmations = async () => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [expired] = await conn.query(
      `SELECT sr.*, s.credits_per_hour
       FROM skill_requests sr
       JOIN skills s ON sr.skill_id = s.id
       WHERE sr.status IN ('approved', 'waiting_confirmation')
         AND sr.confirmation_deadline < NOW()`
    );

    for (const request of expired) {
      const cost = parseFloat(request.hours_requested) * parseFloat(request.credits_per_hour);

      await conn.query(
        "UPDATE skill_requests SET status = 'disputed' WHERE id = $1",
        [request.id]
      );

      await conn.query(
        `INSERT INTO disputes (request_id, raised_by, reason)
         VALUES ($1, $2, 'Auto-disputed: confirmation window expired without mutual confirmation')`,
        [request.id, request.provider_id]
      );

      await conn.query(
        'UPDATE users SET locked_credits = GREATEST(0, locked_credits - $1) WHERE id = $2',
        [cost, request.requester_id]
      );

      console.log(`⏰ Auto-disputed request #${request.id} — deadline expired`);
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    console.error('checkExpiredConfirmations error:', err);
  } finally {
    conn.release();
  }
};

module.exports = {
  createRequest, getMyRequests, getIncomingRequests,
  respondToRequest, confirmSession, checkExpiredConfirmations,
};
