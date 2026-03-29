// routes/admin.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/admin.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.use(protect, adminOnly);

// Dashboard
router.get('/stats',                        ctrl.getStats);
router.get('/analytics',                    ctrl.getAnalytics);

// Users
router.get('/users',                        ctrl.getAllUsers);
router.get('/users/:id',                    ctrl.getUserDetail);
router.put('/users/:id/toggle-block',       ctrl.toggleBlock);
router.put('/users/:id/strike',             ctrl.manageStrike);
router.put('/users/:id/adjust-credits',     ctrl.adjustCredits);

// Sessions (all skill_requests)
router.get('/sessions',                     ctrl.getAllSessions);

// Requests (kept for compatibility)
router.get('/requests',                     ctrl.getAllRequests);

// Disputes
router.get('/disputes',                     ctrl.getDisputes);
router.put('/disputes/:id/resolve',         ctrl.resolveDispute);

module.exports = router;
