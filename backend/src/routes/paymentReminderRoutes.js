/**
 * Payment Reminder Routes
 */

const express = require('express');
const router = express.Router();
const paymentReminderController = require('../controllers/paymentReminderController');
const { authenticateToken } = require('../middleware/auth');

// Get all reminders
router.get('/', authenticateToken, paymentReminderController.getAllReminders);

// Get reminder statistics
router.get('/stats', authenticateToken, paymentReminderController.getReminderStats);

// Get reminder by ID
router.get('/:id', authenticateToken, paymentReminderController.getReminderById);

// Create reminder manually
router.post('/', authenticateToken, paymentReminderController.createReminder);

// Send reminder immediately
router.post('/:id/send-now', authenticateToken, paymentReminderController.sendReminderNow);

// Cancel reminder
router.post('/:id/cancel', authenticateToken, paymentReminderController.cancelReminder);

// Trigger manual reminder processing
router.post('/process-now', authenticateToken, paymentReminderController.processReminders);

module.exports = router;
