// controllers/rating.controller.js
const db = require('../config/db');

// Submit a rating after a completed session
const submitRating = async (req, res) => {
  const { request_id, rating, review } = req.body;
  const from_user = req.user.id;

  try {
    // Verify session is completed and user was a participant
    const [[request]] = await db.query(
      `SELECT * FROM skill_requests
       WHERE id = ? AND status = 'completed'
         AND (requester_id = ? OR provider_id = ?)`,
      [request_id, from_user, from_user]
    );

    if (!request) {
      return res.status(404).json({ error: 'Completed session not found' });
    }

    // Rate the OTHER party
    const to_user = from_user === request.requester_id
      ? request.provider_id
      : request.requester_id;

    await db.query(
      `INSERT INTO ratings (from_user, to_user, request_id, rating, review)
       VALUES (?, ?, ?, ?, ?)`,
      [from_user, to_user, request_id, rating, review]
    );

    res.status(201).json({ message: 'Rating submitted' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Already rated this session' });
    }
    res.status(500).json({ error: 'Failed to submit rating' });
  }
};

// Get ratings received by a user
const getUserRatings = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, u.name AS from_name, u.avatar_url
       FROM ratings r
       JOIN users u ON r.from_user = u.id
       WHERE r.to_user = ?
       ORDER BY r.created_at DESC`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
};

module.exports = { submitRating, getUserRatings };
