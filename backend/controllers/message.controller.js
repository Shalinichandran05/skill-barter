// controllers/message.controller.js
// Handles all messaging operations

const db = require('../config/db');

// ── Get all conversations for current user ────────────────
// Returns one row per unique conversation partner with latest message
const getConversations = async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await db.query(
      `SELECT
         -- The other person in the conversation
         CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AS other_user_id,
         u.name       AS other_name,
         u.avatar_url AS other_avatar,
         -- Latest message in this conversation
         m.content    AS last_message,
         m.created_at AS last_time,
         m.sender_id  AS last_sender_id,
         -- Count unread messages sent TO current user
         SUM(CASE WHEN m2.is_read = FALSE AND m2.receiver_id = ? THEN 1 ELSE 0 END) AS unread_count
       FROM messages m
       JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
       -- Self join to get latest message per conversation
       JOIN (
         SELECT
           LEAST(sender_id, receiver_id)    AS u1,
           GREATEST(sender_id, receiver_id) AS u2,
           MAX(id) AS max_id
         FROM messages
         WHERE sender_id = ? OR receiver_id = ?
         GROUP BY u1, u2
       ) latest ON m.id = latest.max_id
       LEFT JOIN messages m2
         ON ((m2.sender_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
              AND m2.receiver_id = ?)
         )
         AND m2.is_read = FALSE
       WHERE m.sender_id = ? OR m.receiver_id = ?
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
  const userId    = req.user.id;
  const otherId   = parseInt(req.params.userId);

  try {
    const [messages] = await db.query(
      `SELECT m.*, 
              s.name AS sender_name, s.avatar_url AS sender_avatar
       FROM messages m
       JOIN users s ON m.sender_id = s.id
       WHERE (m.sender_id = ? AND m.receiver_id = ?)
          OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.created_at ASC`,
      [userId, otherId, otherId, userId]
    );

    // Mark messages sent to current user as read
    await db.query(
      `UPDATE messages SET is_read = TRUE
       WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE`,
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
    // Check receiver exists and is not blocked
    const [[receiver]] = await db.query(
      'SELECT id, name FROM users WHERE id = ? AND is_blocked = FALSE',
      [receiver_id]
    );
    if (!receiver) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [result] = await db.query(
      `INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)`,
      [sender_id, receiver_id, content.trim()]
    );

    // Fetch the full message to return (needed for socket emit)
    const [[message]] = await db.query(
      `SELECT m.*, s.name AS sender_name, s.avatar_url AS sender_avatar
       FROM messages m
       JOIN users s ON m.sender_id = s.id
       WHERE m.id = ?`,
      [result.insertId]
    );

    // Emit via socket if available
    const io = req.app.get('io');
    if (io) {
      // Emit to receiver's room
      io.to(`user_${receiver_id}`).emit('new_message', message);
      // Also emit back to sender so other tabs update
      io.to(`user_${sender_id}`).emit('message_sent', message);
    }

    res.status(201).json(message);
  } catch (err) {
    console.error('sendMessage error:', err.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// ── Get total unread count for current user ───────────────
const getUnreadCount = async (req, res) => {
  try {
    const [[{ count }]] = await db.query(
      'SELECT COUNT(*) AS count FROM messages WHERE receiver_id = ? AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ count: parseInt(count) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

module.exports = { getConversations, getMessages, sendMessage, getUnreadCount };
