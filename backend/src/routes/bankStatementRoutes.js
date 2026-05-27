const express = require('express');
const router = express.Router();
const multer = require('multer');
const bankStatementController = require('../controllers/bankStatementController');
const { authenticateToken } = require('../middleware/auth');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');

router.use(authenticateToken);
router.use(resolveCompanyContext);


const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/upload', upload.single('file'), bankStatementController.uploadStatement);
router.get('/history', bankStatementController.getImportHistory);

module.exports = router;
