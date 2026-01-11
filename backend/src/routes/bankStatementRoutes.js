const express = require('express');
const router = express.Router();
const multer = require('multer');
const bankStatementController = require('../controllers/bankStatementController');
const { authenticateToken } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/upload', authenticateToken, upload.single('file'), bankStatementController.uploadStatement);
router.get('/history', authenticateToken, bankStatementController.getImportHistory);

module.exports = router;
