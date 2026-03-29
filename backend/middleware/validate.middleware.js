// middleware/validate.middleware.js
// Centralized express-validator result handler

const { validationResult } = require('express-validator');

/**
 * Extracts validation errors from express-validator chains.
 * Returns 422 with error list if any rule fails.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error:  'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

module.exports = validate;
