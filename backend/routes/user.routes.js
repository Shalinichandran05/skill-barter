// routes/user.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/user.controller');

router.get('/:id/profile', ctrl.getUserProfile);

module.exports = router;
