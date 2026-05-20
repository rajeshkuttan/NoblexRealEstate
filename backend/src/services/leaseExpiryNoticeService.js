const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { Lease, Tenant, Unit, Property } = require('../models');
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

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-AE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textToHtml(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n\n')
    .replace(/<\s*li\s*>/gi, '- ')
    .replace(/<\s*\/li\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildLeaseRenewalNoticeTemplate(lease, options = {}) {
  const currentMonthlyRent = Number(options.currentRent ?? lease.rentAmount ?? 0);
  const currentAnnualRent = Number(options.annualRent ?? currentMonthlyRent * 12);
  const proposedRent = options.proposedRent != null && options.proposedRent !== ''
    ? Number(options.proposedRent)
    : null;
  const propertyName = lease.unit?.property?.title || 'your property';
  const unitNumber = lease.unit?.unitNumber || lease.unit?.unit || '';
  const tenantName = lease.tenant?.name || 'Tenant';
  const expiryDate = formatDate(lease.endDate);
  const subject = options.subject || `Lease renewal notice for ${propertyName}${unitNumber ? ` - Unit ${unitNumber}` : ''}`;
  const proposedRentLine = proposedRent != null
    ? `<li><strong>Proposed revised rent:</strong> ${formatCurrency(proposedRent)}</li>`
    : '';

  const defaultHtml = `
    <p>Dear ${tenantName},</p>
    <p>This is a renewal notice regarding your tenancy contract for <strong>${propertyName}${unitNumber ? `, Unit ${unitNumber}` : ''}</strong>.</p>
    <p>Your current lease is scheduled to expire on <strong>${expiryDate}</strong>.</p>
    <p>Current rent details:</p>
    <ul>
      <li><strong>Current monthly rent:</strong> ${formatCurrency(currentMonthlyRent)}</li>
      <li><strong>Current annual rent:</strong> ${formatCurrency(currentAnnualRent)}</li>
      ${proposedRentLine}
    </ul>
    <p>Please contact us to discuss your renewal terms. If any rent revision is proposed, it will be subject to applicable UAE law and the terms of your contract.</p>
    <p>Kind regards,<br />Property Management</p>
  `.trim();

  const defaultText = [
    `Dear ${tenantName},`,
    '',
    `This is a renewal notice regarding your tenancy contract for ${propertyName}${unitNumber ? `, Unit ${unitNumber}` : ''}.`,
    `Your current lease is scheduled to expire on ${expiryDate}.`,
    '',
    `Current monthly rent: ${formatCurrency(currentMonthlyRent)}`,
    `Current annual rent: ${formatCurrency(currentAnnualRent)}`,
    proposedRent != null ? `Proposed revised rent: ${formatCurrency(proposedRent)}` : null,
    '',
    'Please contact us to discuss your renewal terms. If any rent revision is proposed, it will be subject to applicable UAE law and the terms of your contract.',
    '',
    'Kind regards,',
    'Property Management'
  ].filter(Boolean).join('\n');

  const customText = typeof options.text === 'string' ? options.text.trim() : '';
  const customHtml = typeof options.html === 'string' ? options.html.trim() : '';
  const text = customText || (customHtml ? htmlToText(customHtml) : defaultText);
  const html = customHtml || (customText ? textToHtml(customText) : defaultHtml);

  return { subject, html, text };
}

function scheduleLeaseRentIncreaseNotices() {
  cron.schedule('0 8 * * *', async () => {
    try {
      const target = new Date();
      target.setDate(target.getDate() + 120);
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
        include: [{
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'email']
        }, {
          model: Unit,
          as: 'unit',
          attributes: ['id', 'unitNumber', 'propertyId'],
          include: [{
            model: Property,
            as: 'property',
            attributes: ['id', 'title']
          }]
        }]
      });

      const transport = createMailTransport();
      const fromAddr =
        process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';
      const disclaimer =
        'This is an automated reminder only and does not constitute legal advice. Rental increases are subject to applicable law, your lease terms, and mutual agreement. Consult qualified counsel if needed.';

      for (const lease of leases) {
        const email = lease.tenant?.email;
        const template = buildLeaseRenewalNoticeTemplate(lease);

        if (transport && email) {
          try {
            await transport.sendMail({
              from: fromAddr,
              to: email,
              subject: template.subject,
              text: `${template.text}\n\n${disclaimer}`,
              html: `${template.html}<p><em>${disclaimer}</em></p>`
            });
          } catch (mailErr) {
            console.error(
              `leaseExpiryNoticeService send failed lease ${lease.id}:`,
              mailErr.message
            );
          }
        } else {
          console.log(
            `[RentIncreaseNotice] Lease ${lease.id} -> ${email || 'no email'} (120 days before ${lease.endDate}) - SMTP not configured or no email`
          );
        }

        await lease.update({ rentIncreaseNoticeSentAt: new Date() });
      }
    } catch (err) {
      console.error('leaseExpiryNoticeService:', err);
    }
  });
}

module.exports = {
  scheduleLeaseRentIncreaseNotices,
  createMailTransport,
  buildLeaseRenewalNoticeTemplate
};
