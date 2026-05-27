const express = require('express');
const router = express.Router();
const creditLimitController = require('../controllers/creditLimitController');
const { authenticateToken } = require('../middleware/auth');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');

router.use(authenticateToken);
router.use(resolveCompanyContext);


router.get('/', creditLimitController.getAllCreditLimits);
router.get('/stats', creditLimitController.getCreditStats);
router.get('/tenant/:tenantId', creditLimitController.getCreditLimitByTenant);
router.put('/tenant/:tenantId', creditLimitController.updateCreditLimit);
router.post('/tenant/:tenantId/hold', creditLimitController.putOnHold);
router.post('/tenant/:tenantId/remove-hold', creditLimitController.removeHold);
router.post('/refresh-all', creditLimitController.refreshAllLimits);

module.exports = router;
