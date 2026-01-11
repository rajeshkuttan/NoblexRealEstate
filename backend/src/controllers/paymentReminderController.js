/**
 * Payment Reminder Controller
 */

const { PaymentReminder, Payment, Tenant, Lease } = require('../models');
const { Op } = require('sequelize');
const paymentReminderService = require('../services/paymentReminderService');

/**
 * Get all reminders
 */
exports.getAllReminders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      tenantId,
      paymentId,
      reminderType
    } = req.query;

    const whereClause = { isActive: true };
    
    if (status) whereClause.status = status;
    if (tenantId) whereClause.tenantId = tenantId;
    if (paymentId) whereClause.paymentId = paymentId;
    if (reminderType) whereClause.reminderType = reminderType;

    const { count, rows: reminders } = await PaymentReminder.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Payment,
          as: 'payment',
          attributes: ['id', 'paymentNumber', 'amount', 'dueDate', 'status']
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'email', 'mobile']
        },
        {
          model: Lease,
          as: 'lease',
          attributes: ['id', 'leaseNumber']
        }
      ],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['scheduledDate', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: {
        reminders,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reminders',
      error: error.message
    });
  }
};

/**
 * Get reminder by ID
 */
exports.getReminderById = async (req, res) => {
  try {
    const { id } = req.params;

    const reminder = await PaymentReminder.findByPk(id, {
      include: [
        {
          model: Payment,
          as: 'payment'
        },
        {
          model: Tenant,
          as: 'tenant'
        },
        {
          model: Lease,
          as: 'lease',
          include: ['unit', 'property']
        }
      ]
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    res.status(200).json({
      success: true,
      data: reminder
    });
  } catch (error) {
    console.error('Get reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reminder',
      error: error.message
    });
  }
};

/**
 * Create reminder manually
 */
exports.createReminder = async (req, res) => {
  try {
    const {
      paymentId,
      tenantId,
      leaseId,
      reminderType,
      method = 'email',
      scheduledDate
    } = req.body;

    const reminder = await PaymentReminder.create({
      paymentId,
      tenantId,
      leaseId,
      reminderType,
      method,
      scheduledDate: scheduledDate || new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Reminder created successfully',
      data: reminder
    });
  } catch (error) {
    console.error('Create reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create reminder',
      error: error.message
    });
  }
};

/**
 * Send reminder immediately
 */
exports.sendReminderNow = async (req, res) => {
  try {
    const { id } = req.params;

    const reminder = await PaymentReminder.findByPk(id, {
      include: ['payment', 'tenant', 'lease']
    });

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    if (reminder.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending reminders can be sent'
      });
    }

    await paymentReminderService.sendReminder(reminder);

    res.status(200).json({
      success: true,
      message: 'Reminder sent successfully',
      data: reminder
    });
  } catch (error) {
    console.error('Send reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reminder',
      error: error.message
    });
  }
};

/**
 * Cancel reminder
 */
exports.cancelReminder = async (req, res) => {
  try {
    const { id } = req.params;

    const reminder = await PaymentReminder.findByPk(id);
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    if (reminder.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending reminders can be cancelled'
      });
    }

    await reminder.update({ status: 'cancelled' });

    res.status(200).json({
      success: true,
      message: 'Reminder cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel reminder',
      error: error.message
    });
  }
};

/**
 * Get reminder statistics
 */
exports.getReminderStats = async (req, res) => {
  try {
    const stats = await paymentReminderService.getReminderStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get reminder stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

/**
 * Trigger manual reminder processing
 */
exports.processReminders = async (req, res) => {
  try {
    await paymentReminderService.processReminders();

    res.status(200).json({
      success: true,
      message: 'Reminder processing triggered successfully'
    });
  } catch (error) {
    console.error('Process reminders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process reminders',
      error: error.message
    });
  }
};
