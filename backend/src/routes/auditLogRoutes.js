const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/', auditLogController.getAuditLogs);

module.exports = router;
