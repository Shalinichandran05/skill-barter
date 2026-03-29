// controllers/user.controller.js
const db = require('../config/db');

const getUserProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.bio, u.avatar_url, u.location, u.mobile, u.created_at,
              u.trust_score, u.strike_count,
              COALESCE(AVG(r.rating), 0) AS avg_rating,
              COUNT(r.id) AS total_ratings
       FROM users u
       LEFT JOIN ratings r ON r.to_user = u.id
       WHERE u.id = $1 AND u.is_blocked = FALSE
       GROUP BY u.id, u.name, u.bio, u.avatar_url, u.location, u.mobile,
                u.created_at, u.trust_score, u.strike_count`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const [skills] = await db.query(
      'SELECT id, skill_name, category, credits_per_hour, availability, is_active FROM skills WHERE user_id = $1 AND is_active = TRUE',
      [req.params.id]
    );

    res.json({ ...rows[0], skills });
  } catch (err) {
    console.error('getUserProfile error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getUserProfile };
