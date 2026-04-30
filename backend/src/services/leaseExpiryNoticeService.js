const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { Lease, Tenant } = require('../models');
const { Op } = require('sequelize');

function createMailTransport() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) return null;
  try {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });
  } catch (err) {
    console.warn('leaseExpiryNoticeService: transporter error', err.message);
    return null;
  }
}

/**
 * Daily job: leases ending in 95 days, active, notice not yet sent.
 */
function scheduleLeaseRentIncreaseNotices() {
  cron.schedule('0 8 * * *', async () => {
    try {
      const target = new Date();
      target.setDate(target.getDate() + 95);
      const dayStart = new Date(target);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(target);
      dayEnd.setHours(23, 59, 59, 999);

      const leases = await Lease.findAll({
        where: {
          status: 'active',
          rentIncreaseNoticeSentAt: null,
          endDate: { [Op.between]: [dayStart, dayEnd] }
        },
        include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'name', 'email'] }]
      });

      const transport = createMailTransport();
      const fromAddr =
        process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';

      for (const lease of leases) {
        const email = lease.tenant?.email;
        const subject =
          'Lease expiry reminder — rent terms may change (general notice)';
        const disclaimer =
          'This is an automated reminder only and does not constitute legal advice. Rental increases are subject to applicable law, your lease terms, and mutual agreement. Consult qualified counsel if needed.';
        const html = `
          <p>Dear ${lease.tenant?.name || 'Tenant'},</p>
          <p>Your lease (ID #${lease.id}) is scheduled to end on <strong>${new Date(lease.endDate).toLocaleDateString('en-AE')}</strong>.</p>
          <p>Please contact property management to discuss renewal or move-out arrangements. Any future rent amount may be subject to negotiation and regulatory requirements.</p>
          <p><em>${disclaimer}</em></p>
        `;

        if (transport && email) {
          try {
            await transport.sendMail({
              from: fromAddr,
              to: email,
              subject,
              text: `${disclaimer}\n\nLease ID ${lease.id}, end date ${lease.endDate}`,
              html
            });
          } catch (mailErr) {
            console.error(
              `leaseExpiryNoticeService send failed lease ${lease.id}:`,
              mailErr.message
            );
          }
        } else {
          console.log(
            `[RentIncreaseNotice] Lease ${lease.id} → ${email || 'no email'} (95 days before ${lease.endDate}) — SMTP not configured or no email`
          );
        }

        await lease.update({ rentIncreaseNoticeSentAt: new Date() });
      }
    } catch (err) {
      console.error('leaseExpiryNoticeService:', err);
    }
  });
}

module.exports = { scheduleLeaseRentIncreaseNotices, createMailTransport };
