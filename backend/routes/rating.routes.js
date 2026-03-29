// routes/rating.routes.js
const router = require('express').Router();
const ctrl   = require('../controllers/rating.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/',              protect, ctrl.submitRating);
router.get('/user/:userId',   ctrl.getUserRatings);

module.exports = router;
