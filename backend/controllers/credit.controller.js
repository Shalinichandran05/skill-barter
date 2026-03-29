// controllers/credit.controller.js
const db = require('../config/db');

const getTransactions = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT ct.*,
              fu.name AS from_name,
              tu.name AS to_name
       FROM credit_transactions ct
       LEFT JOIN users fu ON ct.from_user = fu.id
       LEFT JOIN users tu ON ct.to_user   = tu.id
       WHERE ct.from_user = $1 OR ct.to_user = $1
       ORDER BY ct.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

const getWallet = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT credits, locked_credits FROM users WHERE id = $1', [req.user.id]
    );
    const user = rows[0];
    res.json({
      available: parseFloat(user.credits) - parseFloat(user.locked_credits),
      total:     parseFloat(user.credits),
      locked:    parseFloat(user.locked_credits),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
};

module.exports = { getTransactions, getWallet };
