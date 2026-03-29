// controllers/skill.controller.js
// CRUD operations for skills + browse/search

const db = require('../config/db');

// ── Create Skill ───────────────────────────────────────────
const createSkill = async (req, res) => {
  const { skill_name, category, description, availability, credits_per_hour } = req.body;

  try {
    const [rows] = await db.query(
      `INSERT INTO skills
         (user_id, skill_name, category, description, availability, credits_per_hour)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [req.user.id, skill_name, category, description, availability, credits_per_hour || 1]
    );

    res.status(201).json({ message: 'Skill added', id: rows[0].id });
  } catch (err) {
    console.error('createSkill error:', err);
    res.status(500).json({ error: 'Failed to create skill' });
  }
};

// ── Get All Skills (browse + search) ──────────────────────
const getAllSkills = async (req, res) => {
  const { search, category, page = 1, limit = 12 } = req.query;
  const offset = (page - 1) * limit;

  try {
    const conditions = ['s.is_active = TRUE', 'u.is_blocked = FALSE'];
    const params     = [];
    let   paramIdx   = 1;

    if (search) {
      conditions.push(`(s.skill_name ILIKE $${paramIdx} OR s.description ILIKE $${paramIdx + 1})`);
      params.push(`%${search}%`, `%${search}%`);
      paramIdx += 2;
    }
    if (category) {
      conditions.push(`s.category = $${paramIdx}`);
      params.push(category);
      paramIdx++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [skills] = await db.query(
      `SELECT s.*, u.name AS provider_name, u.avatar_url, u.location,
              u.trust_score, u.strike_count,
              COALESCE(AVG(r.rating), 0) AS avg_rating,
              COUNT(r.id) AS rating_count
       FROM skills s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN ratings r ON r.to_user = u.id
       ${where}
       GROUP BY s.id, u.name, u.avatar_url, u.location, u.trust_score, u.strike_count
       ORDER BY s.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM skills s
       JOIN users u ON s.user_id = u.id
       ${where}`,
      params
    );

    const total = parseInt(countRows[0].total);
    res.json({ skills, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('getAllSkills error:', err);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
};

// ── Get Skills by User ─────────────────────────────────────
const getMySkills = async (req, res) => {
  try {
    const [skills] = await db.query(
      'SELECT * FROM skills WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your skills' });
  }
};

// ── Get Single Skill ───────────────────────────────────────
const getSkillById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.id, s.user_id, s.skill_name, s.category, s.description,
              s.availability, s.credits_per_hour, s.is_active, s.created_at,
              u.id AS provider_user_id,
              u.name AS provider_name, u.bio, u.avatar_url, u.location,
              u.trust_score, u.strike_count,
              COALESCE(AVG(r.rating), 0) AS avg_rating,
              COUNT(r.id) AS rating_count
       FROM skills s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN ratings r ON r.to_user = u.id
       WHERE s.id = $1
       GROUP BY s.id, s.user_id, s.skill_name, s.category, s.description,
                s.availability, s.credits_per_hour, s.is_active, s.created_at,
                u.id, u.name, u.bio, u.avatar_url, u.location, u.trust_score, u.strike_count`,
      [req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Skill not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch skill' });
  }
};

// ── Update Skill ───────────────────────────────────────────
const updateSkill = async (req, res) => {
  const { skill_name, category, description, availability, credits_per_hour, is_active } = req.body;

  try {
    const [rows] = await db.query('SELECT user_id FROM skills WHERE id = $1', [req.params.id]);
    if (!rows.length || rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorised' });
    }

    await db.query(
      `UPDATE skills SET skill_name=$1, category=$2, description=$3,
         availability=$4, credits_per_hour=$5, is_active=$6 WHERE id=$7`,
      [skill_name, category, description, availability, credits_per_hour, is_active, req.params.id]
    );

    res.json({ message: 'Skill updated' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
};

// ── Delete Skill ───────────────────────────────────────────
const deleteSkill = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id FROM skills WHERE id = $1', [req.params.id]);
    if (!rows.length || rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorised' });
    }

    await db.query('DELETE FROM skills WHERE id = $1', [req.params.id]);
    res.json({ message: 'Skill deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
};

// ── Get Skill Categories ───────────────────────────────────
const getCategories = async (_req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT DISTINCT category FROM skills WHERE is_active = TRUE ORDER BY category'
    );
    res.json(rows.map(r => r.category));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

module.exports = {
  createSkill, getAllSkills, getMySkills, getSkillById,
  updateSkill, deleteSkill, getCategories,
};
