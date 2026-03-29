// routes/skill.routes.js
const router  = require('express').Router();
const ctrl    = require('../controllers/skill.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/',            ctrl.getAllSkills);       // public browse
router.get('/categories',  ctrl.getCategories);      // public category list
router.get('/mine',        protect, ctrl.getMySkills);
router.get('/:id',         ctrl.getSkillById);
router.post('/',           protect, ctrl.createSkill);
router.put('/:id',         protect, ctrl.updateSkill);
router.delete('/:id',      protect, ctrl.deleteSkill);

module.exports = router;
