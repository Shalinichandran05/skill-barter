// controllers/message.controller.js
// Handles all messaging operations

const db = require('../config/db');

// ── Get all conversations for current user ────────────────
const getConversations = async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await db.query(
      `SELECT
         CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS other_user_id,
         u.name       AS other_name,
         u.avatar_url AS other_avatar,
         m.content    AS last_message,
         m.created_at AS last_time,
         m.sender_id  AS last_sender_id,
         SUM(CASE WHEN m2.is_read = FALSE AND m2.receiver_id = $2 THEN 1 ELSE 0 END) AS unread_count
       FROM messages m
       JOIN users u ON u.id = CASE WHEN m.sender_id = $3 THEN m.receiver_id ELSE m.sender_id END
       JOIN (
         SELECT
           LEAST(sender_id, receiver_id)    AS u1,
           GREATEST(sender_id, receiver_id) AS u2,
           MAX(id) AS max_id
         FROM messages
         WHERE sender_id = $4 OR receiver_id = $5
         GROUP BY u1, u2
       ) latest ON m.id = latest.max_id
       LEFT JOIN messages m2
         ON ((m2.sender_id = CASE WHEN m.sender_id = $6 THEN m.receiver_id ELSE m.sender_id END
              AND m2.receiver_id = $7)
         )
         AND m2.is_read = FALSE
       WHERE m.sender_id = $8 OR m.receiver_id = $9
       GROUP BY other_user_id, u.name, u.avatar_url, m.content, m.created_at, m.sender_id
       ORDER BY m.created_at DESC`,
      [userId, userId, userId, userId, userId, userId, userId, userId, userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('getConversations error:', err.message);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

// ── Get messages between current user and another user ────
const getMessages = async (req, res) => {
  const userId  = req.user.id;
  const otherId = parseInt(req.params.userId);

  try {
    const [messages] = await db.query(
      `SELECT m.*,
              s.name AS sender_name, s.avatar_url AS sender_avatar
       FROM messages m
       JOIN users s ON m.sender_id = s.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $3 AND m.receiver_id = $4)
       ORDER BY m.created_at ASC`,
      [userId, otherId, otherId, userId]
    );

    // Mark messages sent to current user as read
    await db.query(
      `UPDATE messages SET is_read = TRUE
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
      [otherId, userId]
    );

    res.json(messages);
  } catch (err) {
    console.error('getMessages error:', err.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// ── Send a message ────────────────────────────────────────
const sendMessage = async (req, res) => {
  const sender_id   = req.user.id;
  const receiver_id = parseInt(req.params.userId);
  const { content } = req.body;

  if (!content?.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }
  if (sender_id === receiver_id) {
    return res.status(400).json({ error: 'Cannot message yourself' });
  }

  try {
    const [recvRows] = await db.query(
      'SELECT id, name FROM users WHERE id = $1 AND is_blocked = FALSE',
      [receiver_id]
    );
    if (!recvRows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [insRows] = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING id`,
      [sender_id, receiver_id, content.trim()]
    );

    const [msgRows] = await db.query(
      `SELECT m.*, s.name AS sender_name, s.avatar_url AS sender_avatar
       FROM messages m
       JOIN users s ON m.sender_id = s.id
       WHERE m.id = $1`,
      [insRows[0].id]
    );

    const message = msgRows[0];

    // Supabase Real-time will automatically pick up the INSERT due to our frontend Postgres changes subscription.
    // No explicit socket emission needed here anymore.

    res.status(201).json(message);
  } catch (err) {
    console.error('sendMessage error:', err.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// ── Get total unread count for current user ───────────────
const getUnreadCount = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT COUNT(*) AS count FROM messages WHERE receiver_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ count: parseInt(rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

module.exports = { getConversations, getMessages, sendMessage, getUnreadCount };
