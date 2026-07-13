'use strict';

const { BuildingAnnouncement, Property } = require('../models');
const { companyWhere } = require('../utils/companyScope');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');
const {
  assertPropertyInCompany,
  selectAnnouncementRecipients,
  sendAnnouncementEmails,
} = require('../services/buildingAnnouncementService');

function userId(req) {
  return req.user?.id || req.userId || null;
}

function serializeAnnouncement(row) {
  const plain = row.toJSON ? row.toJSON() : row;
  return {
    ...plain,
    propertyTitle: plain.property?.title || null,
  };
}

async function runSend(announcement, companyId) {
  const { emails } = await selectAnnouncementRecipients({
    companyId,
    propertyId: announcement.propertyId,
    minDaysEndDate: announcement.minDaysEndDate,
    strictRenewalFilter: announcement.strictRenewalFilter,
    minInitialTermDays: announcement.minInitialTermDays,
  });

  const { emailsSent, emailsSkipped, sendErrors } = await sendAnnouncementEmails({
    subject: announcement.subject,
    html: announcement.bodyHtml,
    emails,
    maxSend: announcement.maxSend,
  });

  const hasHardFail = sendErrors.length > 0 && emailsSent === 0 && emails.length > 0;
  const status = hasHardFail ? 'failed' : 'sent';
  const lastError = sendErrors.length ? sendErrors.slice(0, 5).join('; ') : null;

  await announcement.update({
    status,
    recipientCount: emails.length,
    emailsSent,
    emailsSkipped,
    lastError,
    sentAt: new Date(),
  });

  return {
    count: emails.length,
    sample: emails.slice(0, 10),
    emailsSent,
    emailsSkipped,
    sendErrors: sendErrors.slice(0, 5),
    status,
  };
}

const list = async (req, res, next) => {
  try {
    const { propertyId, status } = req.query;
    const { page, limit, offset } = normalizePagination(req.query, 20, 100);
    const where = { ...companyWhere(req) };
    if (propertyId) where.propertyId = parseInt(propertyId, 10);
    if (status && ['draft', 'sent', 'failed'].includes(String(status))) {
      where.status = status;
    }

    const { rows, count } = await BuildingAnnouncement.findAndCountAll({
      where,
      include: [{ model: Property, as: 'property', attributes: ['id', 'title'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      success: true,
      data: {
        announcements: rows.map(serializeAnnouncement),
        pagination: createPaginationMeta(count, page, limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const row = await BuildingAnnouncement.findOne({
      where: { id: req.params.id, ...companyWhere(req) },
      include: [{ model: Property, as: 'property', attributes: ['id', 'title'] }],
    });
    if (!row) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    res.json({ success: true, data: serializeAnnouncement(row) });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const {
      propertyId,
      subject,
      bodyHtml,
      html,
      minDaysEndDate = 60,
      minInitialTermDays = 90,
      strictRenewalFilter = false,
      maxSend = 50,
      sendEmails = false,
    } = req.body;

    const body = bodyHtml || html;
    if (!propertyId || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'propertyId, subject, and bodyHtml are required',
      });
    }

    await assertPropertyInCompany(req.companyId, propertyId);

    const announcement = await BuildingAnnouncement.create({
      companyId: req.companyId,
      propertyId: parseInt(propertyId, 10),
      subject: String(subject).trim(),
      bodyHtml: String(body).trim(),
      status: 'draft',
      minDaysEndDate: parseInt(minDaysEndDate, 10) || 60,
      minInitialTermDays: parseInt(minInitialTermDays, 10) || 90,
      strictRenewalFilter: !!strictRenewalFilter,
      maxSend: Math.min(Math.max(parseInt(maxSend, 10) || 50, 1), 200),
      createdBy: userId(req),
      updatedBy: userId(req),
    });

    let sendResult = null;
    if (sendEmails) {
      sendResult = await runSend(announcement, req.companyId);
      await announcement.reload({
        include: [{ model: Property, as: 'property', attributes: ['id', 'title'] }],
      });
    } else {
      const { emails } = await selectAnnouncementRecipients({
        companyId: req.companyId,
        propertyId: announcement.propertyId,
        minDaysEndDate: announcement.minDaysEndDate,
        strictRenewalFilter: announcement.strictRenewalFilter,
        minInitialTermDays: announcement.minInitialTermDays,
      });
      await announcement.update({ recipientCount: emails.length });
      sendResult = {
        count: emails.length,
        sample: emails.slice(0, 10),
        emailsSent: 0,
        emailsSkipped: 0,
        sendErrors: [],
        status: 'draft',
      };
      await announcement.reload({
        include: [{ model: Property, as: 'property', attributes: ['id', 'title'] }],
      });
    }

    res.status(201).json({
      success: true,
      message: sendEmails
        ? `Sent ${sendResult.emailsSent} email(s); ${sendResult.emailsSkipped} not sent (cap or skipped).`
        : `Draft saved. ${sendResult.count} recipient(s) match filters.`,
      data: {
        announcement: serializeAnnouncement(announcement),
        ...sendResult,
      },
    });
  } catch (error) {
    if (error.status === 404 || error.statusCode === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const row = await BuildingAnnouncement.findOne({
      where: { id: req.params.id, ...companyWhere(req) },
    });
    if (!row) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    if (row.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft announcements can be edited',
      });
    }

    const {
      propertyId,
      subject,
      bodyHtml,
      html,
      minDaysEndDate,
      minInitialTermDays,
      strictRenewalFilter,
      maxSend,
      sendEmails = false,
    } = req.body;

    if (propertyId != null) {
      await assertPropertyInCompany(req.companyId, propertyId);
      row.propertyId = parseInt(propertyId, 10);
    }
    if (subject != null) row.subject = String(subject).trim();
    const body = bodyHtml != null ? bodyHtml : html;
    if (body != null) row.bodyHtml = String(body).trim();
    if (minDaysEndDate != null) row.minDaysEndDate = parseInt(minDaysEndDate, 10) || 60;
    if (minInitialTermDays != null) {
      row.minInitialTermDays = parseInt(minInitialTermDays, 10) || 90;
    }
    if (strictRenewalFilter != null) row.strictRenewalFilter = !!strictRenewalFilter;
    if (maxSend != null) {
      row.maxSend = Math.min(Math.max(parseInt(maxSend, 10) || 50, 1), 200);
    }
    row.updatedBy = userId(req);
    await row.save();

    let sendResult = null;
    if (sendEmails) {
      sendResult = await runSend(row, req.companyId);
    }

    await row.reload({
      include: [{ model: Property, as: 'property', attributes: ['id', 'title'] }],
    });

    res.json({
      success: true,
      message: sendEmails
        ? `Sent ${sendResult.emailsSent} email(s); ${sendResult.emailsSkipped} not sent (cap or skipped).`
        : 'Draft updated',
      data: {
        announcement: serializeAnnouncement(row),
        ...(sendResult || {}),
      },
    });
  } catch (error) {
    if (error.status === 404 || error.statusCode === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const row = await BuildingAnnouncement.findOne({
      where: { id: req.params.id, ...companyWhere(req) },
    });
    if (!row) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    await row.destroy();
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    next(error);
  }
};

const send = async (req, res, next) => {
  try {
    const row = await BuildingAnnouncement.findOne({
      where: { id: req.params.id, ...companyWhere(req) },
      include: [{ model: Property, as: 'property', attributes: ['id', 'title'] }],
    });
    if (!row) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }
    if (row.status === 'sent') {
      return res.status(400).json({
        success: false,
        message: 'Announcement already sent. Create a new notice to send again.',
      });
    }

    const sendResult = await runSend(row, req.companyId);
    row.updatedBy = userId(req);
    await row.save();
    await row.reload({
      include: [{ model: Property, as: 'property', attributes: ['id', 'title'] }],
    });

    res.json({
      success: true,
      message: `Sent ${sendResult.emailsSent} email(s); ${sendResult.emailsSkipped} not sent (cap or skipped).`,
      data: {
        announcement: serializeAnnouncement(row),
        ...sendResult,
      },
    });
  } catch (error) {
    if (error.status === 404 || error.statusCode === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  send,
};
