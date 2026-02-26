const express = require('express');
const router = express.Router();
const journalVoucherController = require('../controllers/journalVoucherController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Apply authentication to all routes
router.use(authMiddleware);

router.get('/', journalVoucherController.getAllJournalVouchers);
router.get('/:id', journalVoucherController.getJournalVoucherById);
router.post('/', journalVoucherController.createJournalVoucher);
router.put('/:id', journalVoucherController.updateJournalVoucher);
router.delete('/:id', journalVoucherController.deleteJournalVoucher);
router.post('/:id/post', journalVoucherController.postJournalVoucher);
router.post('/:id/unpost', journalVoucherController.unpostJournalVoucher);

module.exports = router;
