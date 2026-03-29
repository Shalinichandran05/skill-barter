// routes/request.routes.js
const router  = require('express').Router();
const ctrl    = require('../controllers/request.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/',                          protect, ctrl.createRequest);
router.get('/mine',                       protect, ctrl.getMyRequests);
router.get('/incoming',                   protect, ctrl.getIncomingRequests);
router.put('/:id/respond',                protect, ctrl.respondToRequest);
router.put('/:id/confirm',                protect, ctrl.confirmSession);

module.exports = router;
