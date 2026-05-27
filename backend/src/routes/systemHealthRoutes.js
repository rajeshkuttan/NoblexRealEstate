const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/auth');
const controller = require('../controllers/systemHealthController');

router.use(authenticateToken);

router.get('/', requirePermission('module:system_health:view'), controller.getSummary);
router.get('/audits', requirePermission('module:system_health:view'), controller.listAudits);
router.get('/report', requirePermission('module:system_health:view'), controller.getReport);
router.get('/uat-scenarios', requirePermission('module:system_health:view'), controller.getUatScenarios);
router.post('/run', requirePermission('module:system_health:run'), controller.runAudit);

module.exports = router;
