/**
 * Payment Reminder Routes
 */

const express = require('express');
const router = express.Router();
const paymentReminderController = require('../controllers/paymentReminderController');
const { authenticateToken } = require('../middleware/auth');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');

router.use(authenticateToken);
router.use(resolveCompanyContext);


// Get all reminders
router.get('/', paymentReminderController.getAllReminders);

// Get reminder statistics
router.get('/stats', paymentReminderController.getReminderStats);

// Get reminder by ID
router.get('/:id', paymentReminderController.getReminderById);

// Create reminder manually
router.post('/', paymentReminderController.createReminder);

// Send reminder immediately
router.post('/:id/send-now', paymentReminderController.sendReminderNow);

// Cancel reminder
router.post('/:id/cancel', paymentReminderController.cancelReminder);

// Trigger manual reminder processing
router.post('/process-now', paymentReminderController.processReminders);

module.exports = router;
