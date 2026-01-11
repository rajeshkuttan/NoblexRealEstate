/**
 * Standing Order Service
 * Handles scheduled processing of standing orders
 */

const cron = require('node-cron');
const { StandingOrder, Payment, Lease, Tenant, BankAccount, User } = require('../models');
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');

class StandingOrderService {
  constructor() {
    this.cronJob = null;
    this.emailTransporter = null;
    this.setupEmailTransporter();
  }

  /**
   * Setup email transporter
   */
  setupEmailTransporter() {
    try {
      this.emailTransporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
    } catch (error) {
      console.warn('⚠️ Email transporter setup failed:', error.message);
      console.warn('⚠️ Email notifications will be disabled');
      this.emailTransporter = null;
    }
  }

  /**
   * Start the cron job for processing standing orders
   * Runs daily at 6:00 AM
   */
  startScheduler() {
    if (this.cronJob) {
      console.log('⚠️ Standing order scheduler is already running');
      return;
    }

    // Run every day at 6:00 AM
    this.cronJob = cron.schedule('0 6 * * *', async () => {
      console.log('🔄 Running standing order processor...');
      await this.processStandingOrders();
    });

    // Also run immediately on startup for testing
    setTimeout(async () => {
      console.log('🔄 Running initial standing order check...');
      await this.processStandingOrders();
    }, 5000);

    console.log('✅ Standing order scheduler started');
  }

  /**
   * Stop the cron job
   */
  stopScheduler() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('⏹️ Standing order scheduler stopped');
    }
  }

  /**
   * Process all due standing orders
   */
  async processStandingOrders() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find all active standing orders due today or overdue
      const dueOrders = await StandingOrder.findAll({
        where: {
          status: 'active',
          isActive: true,
          nextScheduledDate: {
            [Op.lte]: today
          }
        },
        include: [
          {
            model: Lease,
            as: 'lease',
            include: ['unit']
          },
          {
            model: Tenant,
            as: 'tenant'
          },
          {
            model: BankAccount,
            as: 'bankAccount'
          }
        ]
      });

      console.log(`📋 Found ${dueOrders.length} standing order(s) due for processing`);

      for (const order of dueOrders) {
        try {
          await this.processOrder(order);
        } catch (error) {
          console.error(`❌ Failed to process order ${order.orderNumber}:`, error.message);
        }
      }

      // Send upcoming payment reminders
      await this.sendUpcomingPaymentReminders();

      console.log('✅ Standing order processing completed');
    } catch (error) {
      console.error('❌ Standing order processing error:', error);
    }
  }

  /**
   * Process a single standing order
   */
  async processOrder(order) {
    try {
      console.log(`💳 Processing standing order ${order.orderNumber}`);

      // Check if lease is still active
      if (order.lease.status !== 'active') {
        await order.update({
          status: 'completed',
          notes: `${order.notes || ''}\nAuto-completed: Lease is no longer active`
        });
        console.log(`⏹️ Order ${order.orderNumber} completed: Lease inactive`);
        return;
      }

      // Check if end date has passed
      if (order.endDate && new Date(order.endDate) < new Date()) {
        await order.update({
          status: 'completed',
          notes: `${order.notes || ''}\nAuto-completed: End date reached`
        });
        console.log(`⏹️ Order ${order.orderNumber} completed: End date reached`);
        return;
      }

      // Create payment record
      const payment = await Payment.create({
        paymentNumber: `PAY-SO-${Date.now()}-${order.id}`,
        leaseId: order.leaseId,
        tenantId: order.tenantId,
        amount: order.amount,
        paymentDate: new Date(),
        dueDate: new Date(),
        paymentMethod: order.paymentMethod === 'bank_transfer' ? 'bank_transfer' : 'online',
        status: 'pending',
        reference: order.orderNumber,
        description: `Recurring payment via standing order ${order.orderNumber}`,
        notes: `Auto-generated from standing order ${order.frequency}`,
        bankDetails: order.tenantBankDetails || {}
      });

      // Update order
      const nextDate = this.calculateNextScheduledDate(order);
      await order.update({
        lastProcessedDate: new Date(),
        nextScheduledDate: nextDate,
        totalProcessed: order.totalProcessed + 1,
        retryCount: 0,
        lastFailureReason: null
      });

      // Send notification to tenant
      if (order.notifyTenant && order.tenant.email) {
        await this.sendPaymentNotification(order, payment, 'processed');
      }

      console.log(`✅ Created payment ${payment.paymentNumber} for order ${order.orderNumber}`);
      console.log(`📅 Next scheduled date: ${nextDate}`);

    } catch (error) {
      console.error(`❌ Error processing order ${order.orderNumber}:`, error);

      // Update failure count
      const newRetryCount = order.retryCount + 1;
      const updates = {
        totalFailed: order.totalFailed + 1,
        retryCount: newRetryCount,
        lastFailureReason: error.message
      };

      // Pause order if max retries reached
      if (newRetryCount >= order.maxRetries) {
        updates.status = 'paused';
        updates.notes = `${order.notes || ''}\nAuto-paused: Max retry attempts reached`;
        
        // Send alert notification
        if (order.notifyTenant && order.tenant.email) {
          await this.sendPaymentNotification(order, null, 'failed');
        }
      }

      await order.update(updates);
    }
  }

  /**
   * Calculate next scheduled date based on frequency
   */
  calculateNextScheduledDate(order) {
    const current = order.lastProcessedDate || order.startDate;
    const next = new Date(current);

    switch (order.frequency) {
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'bi_weekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        if (order.dayOfMonth) {
          next.setDate(Math.min(order.dayOfMonth, this.getDaysInMonth(next)));
        }
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'semi_annual':
        next.setMonth(next.getMonth() + 6);
        break;
      case 'annual':
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        next.setMonth(next.getMonth() + 1);
    }

    return next;
  }

  /**
   * Get days in month
   */
  getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  /**
   * Send upcoming payment reminders
   */
  async sendUpcomingPaymentReminders() {
    try {
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + 3); // Default 3 days ahead
      reminderDate.setHours(0, 0, 0, 0);

      const upcomingOrders = await StandingOrder.findAll({
        where: {
          status: 'active',
          isActive: true,
          notifyTenant: true,
          nextScheduledDate: {
            [Op.between]: [new Date(), reminderDate]
          }
        },
        include: [
          {
            model: Tenant,
            as: 'tenant'
          },
          {
            model: Lease,
            as: 'lease',
            include: ['unit']
          }
        ]
      });

      for (const order of upcomingOrders) {
        if (order.tenant.email) {
          await this.sendPaymentNotification(order, null, 'upcoming');
        }
      }

      if (upcomingOrders.length > 0) {
        console.log(`📧 Sent ${upcomingOrders.length} upcoming payment reminder(s)`);
      }
    } catch (error) {
      console.error('❌ Error sending reminders:', error);
    }
  }

  /**
   * Send payment notification email
   */
  async sendPaymentNotification(order, payment, type) {
    try {
      if (!this.emailTransporter) return;

      const tenant = order.tenant;
      const lease = order.lease;

      let subject, text;

      switch (type) {
        case 'upcoming':
          subject = 'Upcoming Automatic Payment Reminder';
          text = `Dear ${tenant.name},\n\n` +
            `This is a reminder that your automatic payment of ${order.amount} ${order.currency} ` +
            `will be processed on ${order.nextScheduledDate.toLocaleDateString()}.\n\n` +
            `Lease: ${lease.leaseNumber}\n` +
            `Unit: ${lease.unit?.unitNumber || 'N/A'}\n` +
            `Amount: ${order.amount} ${order.currency}\n\n` +
            `Please ensure sufficient funds are available in your account.\n\n` +
            `Best regards,\nEmirates Lease Flow`;
          break;

        case 'processed':
          subject = 'Payment Processed Successfully';
          text = `Dear ${tenant.name},\n\n` +
            `Your automatic payment has been processed successfully.\n\n` +
            `Payment Number: ${payment?.paymentNumber}\n` +
            `Amount: ${order.amount} ${order.currency}\n` +
            `Date: ${new Date().toLocaleDateString()}\n\n` +
            `Next payment will be processed on ${order.nextScheduledDate.toLocaleDateString()}.\n\n` +
            `Best regards,\nEmirates Lease Flow`;
          break;

        case 'failed':
          subject = 'Payment Processing Failed - Action Required';
          text = `Dear ${tenant.name},\n\n` +
            `We were unable to process your automatic payment.\n\n` +
            `Amount: ${order.amount} ${order.currency}\n` +
            `Reason: ${order.lastFailureReason}\n\n` +
            `Your standing order has been paused. Please contact us to resolve this issue.\n\n` +
            `Best regards,\nEmirates Lease Flow`;
          break;

        default:
          return;
      }

      if (this.emailTransporter) {
        await this.emailTransporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@emiratesleaseflow.com',
          to: tenant.email,
          subject,
          text
        });
      } else {
        console.log('📧 Email notification skipped (transporter not configured)');
      }

    } catch (error) {
      console.error('❌ Error sending notification:', error);
    }
  }

  /**
   * Process a specific order manually
   */
  async processOrderManually(orderId) {
    const order = await StandingOrder.findByPk(orderId, {
      include: [
        {
          model: Lease,
          as: 'lease',
          include: ['unit']
        },
        {
          model: Tenant,
          as: 'tenant'
        },
        {
          model: BankAccount,
          as: 'bankAccount'
        }
      ]
    });

    if (!order) {
      throw new Error('Standing order not found');
    }

    if (order.status !== 'active') {
      throw new Error('Only active standing orders can be processed');
    }

    await this.processOrder(order);
    return { success: true, message: 'Standing order processed successfully' };
  }
}

// Create singleton instance
const standingOrderService = new StandingOrderService();

module.exports = standingOrderService;
