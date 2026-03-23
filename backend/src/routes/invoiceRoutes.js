const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Invoice routes
router.get('/', invoiceController.getAllInvoices);
router.get('/stats', invoiceController.getInvoiceStats);
router.get('/overdue', invoiceController.getOverdueInvoices);
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
