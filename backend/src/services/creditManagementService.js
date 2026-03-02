/**
 * Credit Management Service
 * Handles credit limit calculations, risk assessment, and collection workflows
 */

const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { CreditLimit, Tenant, Payment, Invoice, sequelize } = require('../models');
const { Op } = require('sequelize');

class CreditManagementService {
  constructor() {
    this.cronJob = null;
    this.emailTransporter = null;
    this.setupEmailTransporter();
    
    // Collection thresholds
    this.collectionThresholds = {
      reminder: 1,        // 1 day overdue
      warning: 7,         // 7 days overdue
      final_notice: 14,   // 14 days overdue
      legal: 30,          // 30 days overdue
      write_off: 90       // 90 days overdue
    };
  }

  setupEmailTransporter() {
    try {
      this.emailTransporter = nodemailer.createTransport({
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
   * Start the cron job for credit management
   * Runs daily at 8 AM
   */
  startScheduler() {
    if (this.cronJob) {
      console.log('⚠️ Credit management scheduler is already running');
      return;
    }

    // Run daily at 8 AM
    this.cronJob = cron.schedule('0 8 * * *', async () => {
      console.log('💳 Running credit management processor...');
      await this.updateAllCreditLimits();
      await this.processCollections();
    });

    // Also run on startup
    setTimeout(async () => {
      console.log('💳 Running initial credit management check...');
      await this.updateAllCreditLimits();
    }, 10000);

    console.log('✅ Credit management scheduler started');
  }

  stopScheduler() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('⏹️ Credit management scheduler stopped');
    }
  }

  /**
   * Calculate credit score based on payment history
   */
  async calculateCreditScore(tenantId) {
    try {
      const payments = await Payment.findAll({
        where: { tenantId, isActive: true },
        order: [['dueDate', 'DESC']],
        limit: 12 // Last 12 payments
      });

      if (payments.length === 0) return 50; // Default score for new tenants

      let score = 100;
      let onTimePayments = 0;
      let latePayments = 0;
      let totalLateDays = 0;

      for (const payment of payments) {
        if (payment.status === 'paid') {
          const dueDate = new Date(payment.dueDate);
          const paidDate = new Date(payment.paymentDate);
          const daysDiff = Math.floor((paidDate - dueDate) / (1000 * 60 * 60 * 24));

          if (daysDiff <= 0) {
            onTimePayments++;
          } else {
            latePayments++;
            totalLateDays += daysDiff;
            score -= Math.min(daysDiff * 2, 20); // Max 20 points deduction per late payment
          }
        } else if (['overdue', 'failed'].includes(payment.status)) {
          score -= 15;
        }
      }

      // Bonus for consistent on-time payments
      if (onTimePayments >= 6) score += 10;
      if (onTimePayments === payments.length) score += 10;

      return Math.max(0, Math.min(100, Math.round(score)));
    } catch (error) {
      console.error('Calculate credit score error:', error);
      return 50;
    }
  }

  /**
   * Assess risk level based on credit score and outstanding balance
   */
  assessRiskLevel(creditScore, utilizationRate, daysOverdue) {
    if (daysOverdue >= 30 || creditScore < 30 || utilizationRate > 0.9) {
      return 'critical';
    } else if (daysOverdue >= 14 || creditScore < 50 || utilizationRate > 0.75) {
      return 'high';
    } else if (daysOverdue >= 7 || creditScore < 70 || utilizationRate > 0.5) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Update credit limit for a tenant
   */
  async updateCreditLimit(tenantId) {
    try {
      let creditLimit = await CreditLimit.findOne({ where: { tenantId, isActive: true } });

      // Get outstanding balance
      const overduePayments = await Payment.findAll({
        where: {
          tenantId,
          status: { [Op.in]: ['pending', 'overdue'] },
          dueDate: { [Op.lt]: new Date() },
          isActive: true
        }
      });

      const currentBalance = await Payment.sum('amount', {
        where: {
          tenantId,
          status: { [Op.in]: ['pending', 'overdue'] },
          isActive: true
        }
      }) || 0;

      const overdueAmount = overduePayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      
      // Get oldest overdue payment
      const oldestOverdue = overduePayments.length > 0 
        ? Math.max(...overduePayments.map(p => {
            const dueDate = new Date(p.dueDate);
            return Math.floor((new Date() - dueDate) / (1000 * 60 * 60 * 24));
          }))
        : 0;

      // Calculate credit score
      const creditScore = await this.calculateCreditScore(tenantId);

      if (!creditLimit) {
        // Create default credit limit for new tenant
        creditLimit = await CreditLimit.create({
          tenantId,
          creditLimit: 50000, // Default AED 50,000
          currentBalance,
          availableCredit: Math.max(0, 50000 - currentBalance),
          creditScore,
          overdueAmount,
          daysOverdue: oldestOverdue,
          nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
        });
      }

      // Calculate utilization and risk
      const utilizationRate = creditLimit.creditLimit > 0 
        ? currentBalance / creditLimit.creditLimit 
        : 0;
      
      const riskLevel = this.assessRiskLevel(creditScore, utilizationRate, oldestOverdue);

      // Determine collection stage
      let collectionStage = 'none';
      if (oldestOverdue >= this.collectionThresholds.write_off) {
        collectionStage = 'write_off';
      } else if (oldestOverdue >= this.collectionThresholds.legal) {
        collectionStage = 'legal';
      } else if (oldestOverdue >= this.collectionThresholds.final_notice) {
        collectionStage = 'final_notice';
      } else if (oldestOverdue >= this.collectionThresholds.warning) {
        collectionStage = 'warning';
      } else if (oldestOverdue >= this.collectionThresholds.reminder) {
        collectionStage = 'reminder';
      }

      // Update credit limit
      await creditLimit.update({
        currentBalance,
        availableCredit: Math.max(0, creditLimit.creditLimit - currentBalance),
        creditScore,
        riskLevel,
        overdueAmount,
        daysOverdue: oldestOverdue,
        collectionStage,
        creditHold: riskLevel === 'critical' || collectionStage === 'legal',
        creditHoldReason: riskLevel === 'critical' ? 'High risk - payment overdue' : null
      });

      return creditLimit;
    } catch (error) {
      console.error('Update credit limit error:', error);
      throw error;
    }
  }

  /**
   * Update all credit limits
   */
  async updateAllCreditLimits() {
    try {
      const tenants = await Tenant.findAll({ where: { isActive: true } });
      let updated = 0;

      for (const tenant of tenants) {
        await this.updateCreditLimit(tenant.id);
        updated++;
      }

      console.log(`✅ Updated ${updated} credit limits`);
    } catch (error) {
      console.error('Update all credit limits error:', error);
    }
  }

  /**
   * Process collection actions
   */
  async processCollections() {
    try {
      const limits = await CreditLimit.findAll({
        where: {
          collectionStage: { [Op.ne]: 'none' },
          isActive: true
        },
        include: [{ model: Tenant, as: 'tenant' }]
      });

      for (const limit of limits) {
        if (this.shouldSendCollectionNotice(limit)) {
          await this.sendCollectionNotice(limit);
        }
      }

      console.log(`✅ Processed ${limits.length} collection cases`);
    } catch (error) {
      console.error('Process collections error:', error);
    }
  }

  /**
   * Check if collection notice should be sent
   */
  shouldSendCollectionNotice(creditLimit) {
    if (!creditLimit.lastCollectionDate) return true;
    
    const daysSinceLastContact = Math.floor((new Date() - new Date(creditLimit.lastCollectionDate)) / (1000 * 60 * 60 * 24));
    
    // Send frequency based on stage
    const frequencies = {
      reminder: 7,
      warning: 3,
      final_notice: 1,
      legal: 1
    };

    return daysSinceLastContact >= (frequencies[creditLimit.collectionStage] || 7);
  }

  /**
   * Send collection notice
   */
  async sendCollectionNotice(creditLimit) {
    try {
      if (!this.emailTransporter || !creditLimit.tenant.email) return;

      const { subject, html } = this.buildCollectionEmail(creditLimit);

      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'collections@emiratesleaseflow.com',
        to: creditLimit.tenant.email,
        subject,
        html
      });

      await creditLimit.update({
        lastCollectionDate: new Date(),
        collectionNotes: `${creditLimit.collectionNotes || ''}\n${new Date().toISOString()}: ${creditLimit.collectionStage} notice sent`
      });

      console.log(`✅ Collection notice sent to tenant ${creditLimit.tenantId}`);
    } catch (error) {
      console.error('Send collection notice error:', error);
    }
  }

  /**
   * Build collection email
   */
  buildCollectionEmail(creditLimit) {
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-AE', {
        style: 'currency',
        currency: 'AED'
      }).format(amount);
    };

    let subject = '';
    let urgency = '';
    let message = '';

    switch (creditLimit.collectionStage) {
      case 'reminder':
        subject = 'Payment Reminder - Emirates Lease Flow';
        urgency = 'REMINDER';
        message = `This is a friendly reminder that you have an outstanding balance of ${formatCurrency(creditLimit.overdueAmount)}.`;
        break;
      case 'warning':
        subject = 'Payment Warning - Action Required';
        urgency = 'WARNING';
        message = `Your payment is now ${creditLimit.daysOverdue} days overdue. Outstanding balance: ${formatCurrency(creditLimit.overdueAmount)}. Please arrange payment immediately.`;
        break;
      case 'final_notice':
        subject = 'FINAL NOTICE - Immediate Action Required';
        urgency = 'FINAL NOTICE';
        message = `This is your FINAL NOTICE. Your account is ${creditLimit.daysOverdue} days overdue with a balance of ${formatCurrency(creditLimit.overdueAmount)}. Immediate payment is required to avoid legal action.`;
        break;
      case 'legal':
        subject = 'LEGAL ACTION NOTICE';
        urgency = 'LEGAL ACTION';
        message = `Your account is now subject to legal proceedings. Outstanding balance: ${formatCurrency(creditLimit.overdueAmount)}. Contact us immediately to resolve this matter.`;
        break;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${urgency === 'LEGAL ACTION' ? '#dc2626' : '#f59e0b'}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">${urgency}</h1>
        </div>
        <div style="padding: 30px; background-color: #f9fafb;">
          <p>Dear ${creditLimit.tenant.name},</p>
          <p>${message}</p>
          <div style="background-color: white; padding: 20px; border-left: 4px solid #dc2626; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #dc2626;">Account Summary</h3>
            <p style="margin: 5px 0;"><strong>Outstanding Balance:</strong> ${formatCurrency(creditLimit.currentBalance)}</p>
            <p style="margin: 5px 0;"><strong>Overdue Amount:</strong> ${formatCurrency(creditLimit.overdueAmount)}</p>
            <p style="margin: 5px 0;"><strong>Days Overdue:</strong> ${creditLimit.daysOverdue} days</p>
            <p style="margin: 5px 0;"><strong>Credit Status:</strong> ${creditLimit.creditHold ? 'ON HOLD' : 'Active'}</p>
          </div>
          <p><strong>Please contact us immediately to arrange payment.</strong></p>
          <p>Best regards,<br><strong>Emirates Lease Flow Collections Team</strong></p>
        </div>
      </div>
    `;

    return { subject, html };
  }

  /**
   * Get credit statistics
   */
  async getCreditStats() {
    const totalLimits = await CreditLimit.count({ where: { isActive: true } });
    const totalExposure = await CreditLimit.sum('current_balance', { where: { isActive: true } }) || 0;
    const totalOverdue = await CreditLimit.sum('overdue_amount', { where: { isActive: true } }) || 0;
    
    const highRisk = await CreditLimit.count({ where: { riskLevel: { [Op.in]: ['high', 'critical'] }, isActive: true } });
    const onHold = await CreditLimit.count({ where: { creditHold: true, isActive: true } });
    const inCollections = await CreditLimit.count({ where: { collectionStage: { [Op.ne]: 'none' }, isActive: true } });

    return {
      totalLimits,
      totalExposure,
      totalOverdue,
      highRisk,
      onHold,
      inCollections
    };
  }
}

// Create singleton instance
const creditManagementService = new CreditManagementService();

module.exports = creditManagementService;
