/**
 * Report Scheduler Service
 * Handles scheduled report generation and email delivery
 * Part of: Phase 5.4 - Report Scheduling
 */

const cron = require('node-cron');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Store active scheduled jobs
const scheduledJobs = new Map();

/**
 * Initialize email transporter
 */
const createEmailTransporter = () => {
  try {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'noreply@emiratesleaseflow.com',
        pass: process.env.SMTP_PASSWORD || 'password'
      }
    });
  } catch (error) {
    console.warn('⚠️ Email transporter setup failed:', error.message);
    return null;
  }
};

/**
 * Schedule a report
 * @param {Object} scheduleConfig - Schedule configuration
 * @returns {String} Job ID
 */
exports.scheduleReport = (scheduleConfig) => {
  try {
    const {
      reportId,
      reportName,
      cronExpression,
      recipients,
      format = 'pdf',
      includeChart = true,
      reportType,
      parameters = {}
    } = scheduleConfig;

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error('Invalid cron expression');
    }

    // Create unique job ID
    const jobId = `report_${reportId}_${Date.now()}`;

    // Schedule the job
    const job = cron.schedule(cronExpression, async () => {
      try {
        console.log(`Running scheduled report: ${reportName} (ID: ${reportId})`);
        
        // Generate report
        const reportData = await generateReport(reportType, parameters);
        
        // Format report
        const formattedReport = await formatReport(reportData, format, includeChart);
        
        // Send email
        await sendReportEmail({
          recipients,
          reportName,
          format,
          attachment: formattedReport
        });

        console.log(`Successfully sent scheduled report: ${reportName}`);
      } catch (error) {
        console.error(`Error executing scheduled report ${reportName}:`, error);
        // Log error but don't crash the scheduler
      }
    });

    // Store job reference
    scheduledJobs.set(jobId, {
      job,
      config: scheduleConfig,
      createdAt: new Date().toISOString(),
      lastRun: null,
      nextRun: getNextRunTime(cronExpression)
    });

    return jobId;
  } catch (error) {
    console.error('Schedule report error:', error);
    throw error;
  }
};

/**
 * Cancel a scheduled report
 * @param {String} jobId - Job ID to cancel
 */
exports.cancelScheduledReport = (jobId) => {
  try {
    const jobData = scheduledJobs.get(jobId);
    
    if (!jobData) {
      throw new Error('Scheduled job not found');
    }

    // Stop the cron job
    jobData.job.stop();
    
    // Remove from map
    scheduledJobs.delete(jobId);

    return true;
  } catch (error) {
    console.error('Cancel scheduled report error:', error);
    throw error;
  }
};

/**
 * Get all scheduled reports
 */
exports.getAllScheduledReports = () => {
  const reports = [];
  
  scheduledJobs.forEach((jobData, jobId) => {
    reports.push({
      jobId,
      reportName: jobData.config.reportName,
      cronExpression: jobData.config.cronExpression,
      recipients: jobData.config.recipients,
      createdAt: jobData.createdAt,
      lastRun: jobData.lastRun,
      nextRun: jobData.nextRun,
      status: 'active'
    });
  });

  return reports;
};

/**
 * Generate report based on type
 */
async function generateReport(reportType, parameters) {
  // Import necessary models and controllers
  const { sequelize } = require('../config/database');
  
  let query = '';
  let results = [];

  switch (reportType) {
    case 'cash_flow_forecast':
      // Generate cash flow forecast
      const forecastingService = require('./forecastingService');
      results = await forecastingService.generateCashFlowForecast(parameters);
      break;

    case 'property_profitability':
      // Query property profitability
      query = `
        SELECT 
          p.property_name,
          COUNT(DISTINCT l.id) as active_leases,
          SUM(pay.amount) as total_revenue,
          SUM(ft.amount) as total_expenses,
          (SUM(pay.amount) - SUM(ft.amount)) as noi
        FROM properties p
        LEFT JOIN leases l ON p.id = l.property_id AND l.status = 'active'
        LEFT JOIN payments pay ON l.id = pay.lease_id AND pay.status = 'completed'
        LEFT JOIN financial_transactions ft ON p.id = ft.property_id AND ft.transaction_type = 'debit'
        WHERE p.is_active = 1
        GROUP BY p.id, p.property_name
        ORDER BY noi DESC
      `;
      [results] = await sequelize.query(query);
      break;

    case 'ar_aging':
      // Query AR aging
      query = `
        SELECT 
          t.first_name,
          t.last_name,
          i.invoice_number,
          i.total_amount,
          i.due_date,
          DATEDIFF(NOW(), i.due_date) as days_overdue
        FROM invoices i
        JOIN tenants t ON i.tenant_id = t.id
        WHERE i.status IN ('pending', 'partially_paid', 'overdue')
        ORDER BY days_overdue DESC
      `;
      [results] = await sequelize.query(query);
      break;

    case 'budget_vs_actual':
      // Query budget comparison
      query = `
        SELECT 
          b.budget_name,
          b.budgeted_revenue,
          b.budgeted_expenses,
          SUM(pay.amount) as actual_revenue,
          SUM(ft.amount) as actual_expenses
        FROM budgets b
        LEFT JOIN payments pay ON pay.payment_date BETWEEN b.period_start AND b.period_end
        LEFT JOIN financial_transactions ft ON ft.transaction_date BETWEEN b.period_start AND b.period_end
        WHERE b.status = 'approved' AND b.is_active = 1
        GROUP BY b.id
      `;
      [results] = await sequelize.query(query);
      break;

    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }

  return results;
}

/**
 * Format report for delivery
 */
async function formatReport(reportData, format, includeChart) {
  if (format === 'csv') {
    return formatAsCSV(reportData);
  } else if (format === 'json') {
    return JSON.stringify(reportData, null, 2);
  } else if (format === 'html') {
    return formatAsHTML(reportData, includeChart);
  } else {
    // Default to JSON
    return JSON.stringify(reportData, null, 2);
  }
}

/**
 * Format data as CSV
 */
function formatAsCSV(data) {
  if (!data || data.length === 0) {
    return 'No data available';
  }

  // Get headers from first row
  const headers = Object.keys(data[0]);
  
  // Build CSV
  let csv = headers.join(',') + '\n';
  
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csv += values.join(',') + '\n';
  });

  return csv;
}

/**
 * Format data as HTML
 */
function formatAsHTML(data, includeChart) {
  if (!data || data.length === 0) {
    return '<html><body><p>No data available</p></body></html>';
  }

  const headers = Object.keys(data[0]);
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th { background-color: #4CAF50; color: white; padding: 12px; text-align: left; }
        td { border: 1px solid #ddd; padding: 8px; }
        tr:nth-child(even) { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <h1>Report Generated: ${new Date().toLocaleDateString()}</h1>
      <table>
        <thead>
          <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${headers.map(h => `<td>${row[h]}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  return html;
}

/**
 * Send report share link via email
 * @param {Object} emailData - Email configuration
 */
exports.sendReportByEmail = async ({ to, reportName, shareLink, expiresAt, message, senderName }) => {
  try {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'noreply@emiratesleaseflow.com',
        pass: process.env.SMTP_PASS || 'password'
      }
    });

    const expiryDate = new Date(expiresAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const mailOptions = {
      from: `"Emirates Lease Flow" <${process.env.SMTP_USER || 'noreply@emiratesleaseflow.com'}>`,
      to,
      subject: `${senderName} shared a report with you: ${reportName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #EC8F00;">Report Shared With You</h2>
          <p><strong>${senderName}</strong> has shared a financial report with you.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Report Name:</strong> ${reportName}</p>
            <p style="margin: 10px 0 0 0;"><strong>Expires:</strong> ${expiryDate}</p>
          </div>

          ${message ? `<p style="font-style: italic; color: #666;">"${message}"</p>` : ''}

          <p>
            <a href="${shareLink}" 
               style="background-color: #EC8F00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Report
            </a>
          </p>

          <p style="color: #666; font-size: 12px;">
            This link will expire on ${expiryDate}. If you have any questions, please contact ${senderName}.
          </p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
          <p style="color: #999; font-size: 11px; text-align: center;">
            Emirates Lease Flow - Real Estate Management System
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Share link email sent to: ${to}`);
  } catch (error) {
    console.error('Send share link email error:', error);
    throw error;
  }
};

/**
 * Send report via email
 */
async function sendReportEmail({ recipients, reportName, format, attachment }) {
  try {
    const transporter = createEmailTransporter();

    // Prepare attachment
    const attachmentBuffer = Buffer.from(attachment, 'utf-8');
    const filename = `${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().substring(0, 10)}.${format}`;

    const mailOptions = {
      from: process.env.SMTP_USER || 'noreply@emiratesleaseflow.com',
      to: recipients.join(', '),
      subject: `Scheduled Report: ${reportName}`,
      html: `
        <h2>${reportName}</h2>
        <p>This is your scheduled report generated on ${new Date().toLocaleString()}.</p>
        <p>Please find the report attached to this email.</p>
        <br>
        <p>Best regards,<br>Emirates Lease Flow System</p>
      `,
      attachments: [
        {
          filename,
          content: attachmentBuffer,
          contentType: format === 'csv' ? 'text/csv' : format === 'html' ? 'text/html' : 'application/json'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    
    return info;
  } catch (error) {
    console.error('Send report email error:', error);
    throw error;
  }
}

/**
 * Get next run time for cron expression
 */
function getNextRunTime(cronExpression) {
  // Simplified - in production, use a proper cron parser
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Next day
}

/**
 * Initialize scheduler on startup
 */
exports.initializeScheduler = () => {
  console.log('Report Scheduler initialized');
  // Load saved schedules from database and restart them
  // This would be implemented with a proper database table in production
};

module.exports = exports;
