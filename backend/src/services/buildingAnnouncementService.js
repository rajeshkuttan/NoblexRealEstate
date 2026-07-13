'use strict';

/**
 * Company-scoped recipient selection + optional SMTP send for building notices.
 */
const { Op } = require('sequelize');
const { Lease, Tenant, Unit, Property } = require('../models');
const { createMailTransport } = require('./leaseExpiryNoticeService');

async function assertPropertyInCompany(companyId, propertyId) {
  const property = await Property.findOne({
    where: { id: propertyId, companyId },
    attributes: ['id', 'title', 'companyId'],
  });
  if (!property) {
    const err = new Error('Property not found for this company');
    err.status = 404;
    throw err;
  }
  return property;
}

async function selectAnnouncementRecipients({
  companyId,
  propertyId,
  minDaysEndDate = 60,
  strictRenewalFilter = false,
  minInitialTermDays = 90,
}) {
  await assertPropertyInCompany(companyId, propertyId);
  const pid = parseInt(propertyId, 10);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minEnd = new Date(today);
  minEnd.setDate(minEnd.getDate() + (parseInt(minDaysEndDate, 10) || 60));
  const minTerm = parseInt(minInitialTermDays, 10) || 90;

  const leases = await Lease.findAll({
    where: {
      companyId,
      status: 'active',
      endDate: { [Op.gte]: minEnd },
    },
    include: [
      {
        model: Tenant,
        as: 'tenant',
        attributes: ['id', 'name', 'email'],
        required: true,
        where: { email: { [Op.ne]: null } },
      },
      {
        model: Unit,
        as: 'unit',
        required: true,
        include: [
          {
            model: Property,
            as: 'property',
            required: true,
            where: { id: pid, companyId },
          },
        ],
      },
    ],
  });

  let filtered = leases;
  if (strictRenewalFilter) {
    filtered = leases.filter((l) => {
      if (l.autoRenewal) return true;
      if (l.renewalTerms && String(l.renewalTerms).trim()) return true;
      const sd = new Date(l.startDate);
      const ed = new Date(l.endDate);
      const days = Math.round((ed.getTime() - sd.getTime()) / 86400000);
      return days >= minTerm;
    });
  }

  const emails = [...new Set(filtered.map((l) => l.tenant.email).filter(Boolean))];
  return { emails, leaseCount: filtered.length };
}

async function sendAnnouncementEmails({ subject, html, emails, maxSend = 50 }) {
  const cap = Math.min(Math.max(parseInt(maxSend, 10) || 50, 1), 200);
  let emailsSent = 0;
  let emailsSkipped = 0;
  const sendErrors = [];

  if (!emails.length) {
    return { emailsSent: 0, emailsSkipped: 0, sendErrors: [] };
  }

  const transport = createMailTransport();
  const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';
  if (!transport) {
    return {
      emailsSent: 0,
      emailsSkipped: emails.length,
      sendErrors: ['SMTP not configured (SMTP_USER / SMTP_PASSWORD)'],
    };
  }

  const slice = emails.slice(0, cap);
  emailsSkipped = emails.length - slice.length;
  for (let i = 0; i < slice.length; i++) {
    try {
      await transport.sendMail({
        from: fromAddr,
        to: slice[i],
        subject,
        html,
        text: String(html).replace(/<[^>]+>/g, ' '),
      });
      emailsSent++;
    } catch (mailErr) {
      sendErrors.push(`${slice[i]}: ${mailErr.message}`);
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  return { emailsSent, emailsSkipped, sendErrors };
}

module.exports = {
  assertPropertyInCompany,
  selectAnnouncementRecipients,
  sendAnnouncementEmails,
};
