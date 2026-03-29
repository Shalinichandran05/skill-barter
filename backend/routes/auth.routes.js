// routes/auth.routes.js
const router   = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('../controllers/auth.controller');
const { protect }  = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  ],
  validate,
  ctrl.register
);

router.post('/login',
  [
    body('email').isEmail(),
    body('password').notEmpty(),
  ],
  validate,
  ctrl.login
);

router.get('/me',      protect, ctrl.getMe);
router.put('/profile', protect, ctrl.updateProfile);

module.exports = router;
