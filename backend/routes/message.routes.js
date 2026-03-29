// routes/message.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/message.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);   // all message routes require auth

router.get('/unread',          ctrl.getUnreadCount);   // GET /api/messages/unread
router.get('/conversations',   ctrl.getConversations); // GET /api/messages/conversations
router.get('/:userId',         ctrl.getMessages);      // GET /api/messages/:userId
router.post('/:userId',        ctrl.sendMessage);      // POST /api/messages/:userId

module.exports = router;
