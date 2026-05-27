const express = require('express');
const multer = require('multer');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');
const { authMiddleware } = require('../middleware/authMiddleware');

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

// Apply authentication middleware to all routes
router.use(authMiddleware);
router.use(resolveCompanyContext);

// Invoice routes
router.get('/', invoiceController.getAllInvoices);
router.get('/stats', invoiceController.getInvoiceStats);
router.get('/overdue', invoiceController.getOverdueInvoices);
router.get('/template', invoiceController.downloadTenantInvoiceImportTemplate);
router.get('/export', invoiceController.exportTenantInvoices);
router.post('/import', excelUpload.single('file'), invoiceController.importTenantInvoices);
router.get('/:id', invoiceController.getInvoiceById);
router.post('/', invoiceController.createInvoice);
router.put('/:id', invoiceController.updateInvoice);
router.delete('/:id', invoiceController.deleteInvoice);
router.post('/:id/duplicate', invoiceController.duplicateInvoice);
router.post('/:id/reminder', invoiceController.sendReminder);
router.post('/:id/post', invoiceController.postInvoice);
router.post('/:id/unpost', invoiceController.unpostInvoice);
router.get('/:id/history', invoiceController.getInvoiceHistory);

module.exports = router;
