const express = require('express');
const router = express.Router();
const creditLimitController = require('../controllers/creditLimitController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, creditLimitController.getAllCreditLimits);
router.get('/stats', authenticateToken, creditLimitController.getCreditStats);
router.get('/tenant/:tenantId', authenticateToken, creditLimitController.getCreditLimitByTenant);
router.put('/tenant/:tenantId', authenticateToken, creditLimitController.updateCreditLimit);
router.post('/tenant/:tenantId/hold', authenticateToken, creditLimitController.putOnHold);
router.post('/tenant/:tenantId/remove-hold', authenticateToken, creditLimitController.removeHold);
router.post('/refresh-all', authenticateToken, creditLimitController.refreshAllLimits);

module.exports = router;
