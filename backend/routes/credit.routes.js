// routes/credit.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/credit.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/wallet',       protect, ctrl.getWallet);
router.get('/transactions', protect, ctrl.getTransactions);

module.exports = router;
