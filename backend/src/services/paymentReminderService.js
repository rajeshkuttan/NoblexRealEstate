/**
 * Payment Reminder Service
 * Handles automated payment reminders
 */

const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { PaymentReminder, Payment, Tenant, Lease, sequelize } = require('../models');
const { Op } = require('sequelize');

class PaymentReminderService {
  constructor() {
    this.cronJob = null;
    this.emailTransporter = null;
    this.setupEmailTransporter();
    
    // Reminder settings (days before/after due date)
    this.reminderSettings = {
      beforeDue: [7, 3, 1], // Remind 7, 3, and 1 day before
      afterDue: [1, 3, 7, 14, 30], // Remind 1, 3, 7, 14, 30 days after
      escalationAfter: 30 // Escalate after 30 days overdue
    };
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
      this.emailTransporter = null;
    }
  }

  /**
   * Start the cron job for processing reminders
   * Runs every hour
   */
  startScheduler() {
    if (this.cronJob) {
      console.log('⚠️ Payment reminder scheduler is already running');
      return;
    }

    // Run every hour
    this.cronJob = cron.schedule('0 * * * *', async () => {
      console.log('🔔 Running payment reminder processor...');
      await this.processReminders();
    });

    // Also run immediately on startup
    setTimeout(async () => {
      console.log('🔔 Running initial payment reminder check...');
      await this.createScheduledReminders();
      await this.processReminders();
    }, 5000);

    console.log('✅ Payment reminder scheduler started');
  }

  /**
   * Stop the cron job
   */
  stopScheduler() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('⏹️ Payment reminder scheduler stopped');
    }
  }

  /**
   * Create scheduled reminders for upcoming/overdue payments
   */
  async createScheduledReminders() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find pending and overdue payments without reminders for today
      const payments = await Payment.findAll({
        where: {
          status: { [Op.in]: ['pending', 'overdue'] },
          isActive: true
        },
        include: [
          {
            model: Tenant,
            as: 'tenant',
            where: { isActive: true }
          },
          {
            model: Lease,
            as: 'lease'
          }
        ]
      });

      let created = 0;

      for (const payment of payments) {
        const dueDate = new Date(payment.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));

        let reminderType = null;
        let scheduledDate = null;

        if (daysDiff > 0) {
          // Before due date
          if (this.reminderSettings.beforeDue.includes(daysDiff)) {
            reminderType = 'before_due';
            scheduledDate = today;
          }
        } else if (daysDiff === 0) {
          // On due date
          reminderType = 'on_due';
          scheduledDate = today;
        } else {
          // After due date (overdue)
          const daysOverdue = Math.abs(daysDiff);
          if (this.reminderSettings.afterDue.includes(daysOverdue)) {
            reminderType = 'after_due';
            scheduledDate = today;
          }
          
          // Escalation
          if (daysOverdue >= this.reminderSettings.escalationAfter) {
            reminderType = 'escalation';
            scheduledDate = today;
          }
        }

        if (reminderType) {
          // Check if reminder already exists for today
          const existing = await PaymentReminder.findOne({
            where: {
              paymentId: payment.id,
              reminderType,
              scheduledDate: { [Op.gte]: today },
              isActive: true
            }
          });

          if (!existing) {
            await PaymentReminder.create({
              paymentId: payment.id,
              tenantId: payment.tenantId,
              leaseId: payment.leaseId,
              reminderType,
              method: 'email',
              scheduledDate,
              escalationLevel: reminderType === 'escalation' ? 1 : 0
            });
            created++;
          }
        }
      }

      if (created > 0) {
        console.log(`📅 Created ${created} new payment reminders`);
      }
    } catch (error) {
      console.error('❌ Error creating scheduled reminders:', error);
    }
  }

  /**
   * Process due reminders
   */
  async processReminders() {
    try {
      const now = new Date();

      // Find pending reminders due now
      const reminders = await PaymentReminder.findAll({
        where: {
          status: 'pending',
          scheduledDate: { [Op.lte]: now },
          isActive: true
        },
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
        ],
        limit: 50 // Process in batches
      });

      console.log(`📋 Found ${reminders.length} reminder(s) to process`);

      for (const reminder of reminders) {
        try {
          await this.sendReminder(reminder);
        } catch (error) {
          console.error(`❌ Failed to send reminder ${reminder.id}:`, error.message);
        }
      }

      console.log('✅ Payment reminder processing completed');
    } catch (error) {
      console.error('❌ Payment reminder processing error:', error);
    }
  }

  /**
   * Send a reminder
   */
  async sendReminder(reminder) {
    try {
      const { payment, tenant, lease } = reminder;

      if (!tenant.email) {
        await reminder.update({
          status: 'failed',
          errorMessage: 'Tenant has no email address'
        });
        return;
      }

      // Send email
      let emailSent = false;
      let emailMessageId = null;

      if (['email', 'all'].includes(reminder.method)) {
        const emailResult = await this.sendEmailReminder(reminder, payment, tenant, lease);
        emailSent = emailResult.success;
        emailMessageId = emailResult.messageId;
      }

      // TODO: Send SMS if configured
      const smsSent = false;

      // TODO: Send WhatsApp if configured
      const whatsappSent = false;

      // Update reminder status
      const anySuccess = emailSent || smsSent || whatsappSent;
      
      await reminder.update({
        status: anySuccess ? 'sent' : 'failed',
        sentDate: anySuccess ? new Date() : null,
        emailSent,
        smsSent,
        whatsappSent,
        emailMessageId,
        errorMessage: anySuccess ? null : 'All delivery methods failed'
      });

      console.log(`✅ Reminder ${reminder.id} processed (email: ${emailSent})`);
    } catch (error) {
      const newRetryCount = reminder.retryCount + 1;
      await reminder.update({
        retryCount: newRetryCount,
        status: newRetryCount >= reminder.maxRetries ? 'failed' : 'pending',
        errorMessage: error.message
      });
      throw error;
    }
  }

  /**
   * Send email reminder
   */
  async sendEmailReminder(reminder, payment, tenant, lease) {
    try {
      if (!this.emailTransporter) {
        return { success: false };
      }

      const { subject, text, html } = this.buildEmailContent(reminder, payment, tenant, lease);

      if (!this.emailTransporter) {
        console.log('📧 Email skipped (transporter not configured)');
        return { success: false, message: 'Email transporter not configured' };
      }

      const info = await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@emiratesleaseflow.com',
        to: tenant.email,
        subject,
        text,
        html
      });

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Build email content
   */
  buildEmailContent(reminder, payment, tenant, lease) {
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-AE', {
        style: 'currency',
        currency: 'AED'
      }).format(amount);
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-GB');
    };

    let subject = '';
    let greeting = `Dear ${tenant.name},`;
    let body = '';

    switch (reminder.reminderType) {
      case 'before_due':
        subject = 'Upcoming Payment Reminder - Emirates Lease Flow';
        body = `This is a friendly reminder that your rent payment of ${formatCurrency(payment.amount)} is due on ${formatDate(payment.dueDate)}.\n\nPlease ensure payment is made before the due date to avoid late fees.`;
        break;

      case 'on_due':
        subject = 'Payment Due Today - Emirates Lease Flow';
        body = `This is a reminder that your rent payment of ${formatCurrency(payment.amount)} is due TODAY (${formatDate(payment.dueDate)}).\n\nPlease arrange payment as soon as possible.`;
        break;

      case 'after_due':
        const daysLate = Math.floor((new Date() - new Date(payment.dueDate)) / (1000 * 60 * 60 * 24));
        subject = 'Overdue Payment Notice - Emirates Lease Flow';
        body = `Your rent payment of ${formatCurrency(payment.amount)} was due on ${formatDate(payment.dueDate)} and is now ${daysLate} day(s) overdue.\n\nPlease make payment immediately to avoid further action. Late fees may apply.`;
        break;

      case 'escalation':
        subject = 'URGENT: Overdue Payment - Final Notice';
        body = `This is a FINAL NOTICE regarding your overdue payment of ${formatCurrency(payment.amount)} which was due on ${formatDate(payment.dueDate)}.\n\nImmediate payment is required. Failure to pay may result in legal action and lease termination.`;
        break;
    }

    const propertyInfo = lease && lease.unit ? 
      `Property: ${lease.property?.title || 'N/A'}\nUnit: ${lease.unit.unitNumber}` : 
      '';

    const text = `${greeting}\n\n${body}\n\nPayment Details:\nPayment Number: ${payment.paymentNumber}\nAmount: ${formatCurrency(payment.amount)}\nDue Date: ${formatDate(payment.dueDate)}\n${propertyInfo}\n\nIf you have already made this payment, please disregard this message.\n\nBest regards,\nEmirates Lease Flow Team`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
          <h2 style="color: #333; margin-top: 0;">${subject}</h2>
          <p>${greeting}</p>
          <p>${body.replace(/\n/g, '<br>')}</p>
          <div style="background-color: #fff; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #007bff;">Payment Details</h3>
            <p style="margin: 5px 0;"><strong>Payment Number:</strong> ${payment.paymentNumber}</p>
            <p style="margin: 5px 0;"><strong>Amount:</strong> ${formatCurrency(payment.amount)}</p>
            <p style="margin: 5px 0;"><strong>Due Date:</strong> ${formatDate(payment.dueDate)}</p>
            ${propertyInfo ? `<p style="margin: 5px 0;">${propertyInfo.replace(/\n/g, '<br>')}</p>` : ''}
          </div>
          <p style="font-size: 12px; color: #666;">If you have already made this payment, please disregard this message.</p>
          <p>Best regards,<br><strong>Emirates Lease Flow Team</strong></p>
        </div>
      </div>
    `;

    return { subject, text, html };
  }

  /**
   * Get reminder statistics
   */
  async getReminderStats() {
    const totalReminders = await PaymentReminder.count({ where: { isActive: true } });
    const sentReminders = await PaymentReminder.count({ where: { status: 'sent', isActive: true } });
    const pendingReminders = await PaymentReminder.count({ where: { status: 'pending', isActive: true } });
    const failedReminders = await PaymentReminder.count({ where: { status: 'failed', isActive: true } });

    const deliveryRate = totalReminders > 0 ? ((sentReminders / totalReminders) * 100).toFixed(2) : 100;

    return {
      totalReminders,
      sentReminders,
      pendingReminders,
      failedReminders,
      deliveryRate: parseFloat(deliveryRate)
    };
  }
}

// Create singleton instance
const paymentReminderService = new PaymentReminderService();

module.exports = paymentReminderService;
