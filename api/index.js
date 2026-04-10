// api/index.js
// Vercel Native Serverless Route target
// This allows zero-conf routing on Vercel for any /api/* paths

const app = require('../backend/server.js');
module.exports = app;
