'use strict';

const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const {
  LeaseRevenueSchedule,
  LeaseRevenueScheduleLine,
  LeaseRevenueReconciliation,
} = require('../../models');
const { companyWhere } = require('../../utils/companyScope');

const REPORT_HANDLERS = {
  register: fetchRegister,
  schedule: fetchScheduleReport,
  recognition: fetchRecognition,
  monthly_recognition: fetchRecognition,
  deferred: fetchDeferred,
  forecast: fetchForecast,
  reconciliation: fetchReconciliationReport,
  exceptions: fetchExceptions,
};

async function fetchRegister(req, query) {
  const where = { ...companyWhere(req) };
  if (query.status) where.status = query.status;
  if (query.leaseId) where.leaseId = query.leaseId;
  return LeaseRevenueSchedule.findAll({
    where,
    order: [['scheduleNumber', 'ASC']],
  });
}

async function fetchScheduleReport(req, query) {
  const where = { ...companyWhere(req) };
  if (query.scheduleId) where.scheduleId = query.scheduleId;
  return LeaseRevenueScheduleLine.findAll({
    where,
    include: [
      {
        model: LeaseRevenueSchedule,
        as: 'schedule',
        attributes: ['scheduleNumber', 'leaseId', 'revenueType'],
      },
    ],
    order: [['scheduleId', 'ASC'], ['lineNumber', 'ASC']],
  });
}

async function fetchRecognition(req, query) {
  const where = { ...companyWhere(req), postingStatus: 'POSTED' };
  if (query.recognitionMonth) where.recognitionMonth = query.recognitionMonth;
  return LeaseRevenueScheduleLine.findAll({
    where,
    include: [{ model: LeaseRevenueSchedule, as: 'schedule', attributes: ['scheduleNumber'] }],
    order: [['recognitionMonth', 'ASC']],
  });
}

async function fetchDeferred(req) {
  return LeaseRevenueSchedule.findAll({
    where: {
      ...companyWhere(req),
      status: { [Op.in]: ['ACTIVE', 'PARTIALLY_RECOGNIZED', 'SUSPENDED'] },
    },
    attributes: [
      'id',
      'scheduleNumber',
      'leaseId',
      'totalContractAmount',
      'recognizedAmount',
      'deferredBalance',
      'remainingAmount',
      'serviceEndDate',
    ],
    order: [['deferredBalance', 'DESC']],
  });
}

async function fetchForecast(req, query) {
  const months = parseInt(query.months, 10) || 6;
  const where = {
    ...companyWhere(req),
    postingStatus: { [Op.in]: ['SCHEDULED', 'DUE', 'DRAFT_JV_CREATED'] },
  };
  const lines = await LeaseRevenueScheduleLine.findAll({
    where,
    include: [{ model: LeaseRevenueSchedule, as: 'schedule', attributes: ['scheduleNumber', 'status'] }],
    order: [['recognitionMonth', 'ASC']],
  });

  const byMonth = {};
  for (const line of lines) {
    if (!['ACTIVE', 'PARTIALLY_RECOGNIZED'].includes(line.schedule?.status)) continue;
    const key = line.recognitionMonth;
    if (!byMonth[key]) byMonth[key] = { recognitionMonth: key, lineCount: 0, totalAmount: 0 };
    byMonth[key].lineCount += 1;
    byMonth[key].totalAmount += parseFloat(line.scheduledAmount || 0);
  }

  return Object.values(byMonth)
    .sort((a, b) => a.recognitionMonth.localeCompare(b.recognitionMonth))
    .slice(0, months)
    .map((r) => ({ ...r, totalAmount: r.totalAmount.toFixed(2) }));
}

async function fetchReconciliationReport(req) {
  return LeaseRevenueReconciliation.findAll({
    where: companyWhere(req),
    order: [['reconciliationDate', 'DESC']],
    limit: 200,
  });
}

async function fetchExceptions(req) {
  return LeaseRevenueScheduleLine.findAll({
    where: {
      ...companyWhere(req),
      postingStatus: { [Op.in]: ['FAILED', 'BLOCKED'] },
    },
    include: [{ model: LeaseRevenueSchedule, as: 'schedule', attributes: ['scheduleNumber'] }],
  });
}

function rowsToSheet(rows, type) {
  if (!rows?.length) return [{ message: 'No data' }];
  if (type === 'register') {
    return rows.map((r) => ({
      Number: r.scheduleNumber,
      Status: r.status,
      Amount: r.totalContractAmount,
      Deferred: r.deferredBalance,
      Recognized: r.recognizedAmount,
      Start: r.serviceStartDate,
      End: r.serviceEndDate,
    }));
  }
  if (type === 'schedule' || type === 'recognition' || type === 'monthly_recognition' || type === 'exceptions') {
    return rows.map((r) => ({
      Schedule: r.schedule?.scheduleNumber,
      Line: r.lineNumber,
      Month: r.recognitionMonth,
      Amount: r.scheduledAmount,
      Status: r.postingStatus,
      Period: `${r.periodStartDate} — ${r.periodEndDate}`,
    }));
  }
  if (type === 'deferred') {
    return rows.map((r) => ({
      Number: r.scheduleNumber,
      Lease: r.leaseId,
      Deferred: r.deferredBalance,
      Recognized: r.recognizedAmount,
      End: r.serviceEndDate,
    }));
  }
  if (type === 'forecast') {
    return rows.map((r) => ({
      Month: r.recognitionMonth,
      Lines: r.lineCount,
      Amount: r.totalAmount,
    }));
  }
  if (type === 'reconciliation') {
    return rows.map((r) => ({
      Date: r.reconciliationDate,
      ScheduleId: r.scheduleId,
      Difference: r.differenceAmount,
      Status: r.status,
    }));
  }
  return rows.map((r) => (r.toJSON ? r.toJSON() : r));
}

function buildExcelBuffer(rows, type) {
  const sheetRows = rowsToSheet(rows, type);
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, type.slice(0, 31));
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function buildCsvBuffer(rows, type) {
  const sheetRows = rowsToSheet(rows, type);
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  return XLSX.utils.sheet_to_csv(ws);
}

function buildPdfBuffer(rows, type, title) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(14).text(title || `Lease Revenue Report — ${type}`, { underline: true });
    doc.moveDown();

    const sheetRows = rowsToSheet(rows, type);
    for (const row of sheetRows.slice(0, 80)) {
      doc.fontSize(9).text(Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(' | '));
    }
    if (sheetRows.length > 80) {
      doc.text(`… and ${sheetRows.length - 80} more rows`);
    }
    doc.end();
  });
}

async function generateReport(req, type, query = {}) {
  const handler = REPORT_HANDLERS[type];
  if (!handler) {
    const err = new Error(`Unknown report type: ${type}`);
    err.statusCode = 400;
    throw err;
  }

  const data = await handler(req, query);
  const format = (query.format || 'json').toLowerCase();

  if (format === 'json') {
    return { contentType: 'application/json', body: { type, count: data.length, data } };
  }
  if (format === 'xlsx') {
    return {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `lease-revenue-${type}.xlsx`,
      body: buildExcelBuffer(data, type),
    };
  }
  if (format === 'csv') {
    return {
      contentType: 'text/csv',
      filename: `lease-revenue-${type}.csv`,
      body: buildCsvBuffer(data, type),
    };
  }
  if (format === 'pdf') {
    return {
      contentType: 'application/pdf',
      filename: `lease-revenue-${type}.pdf`,
      body: await buildPdfBuffer(data, type, query.title),
    };
  }

  const err = new Error(`Unsupported format: ${format}`);
  err.statusCode = 400;
  throw err;
}

module.exports = {
  generateReport,
  REPORT_HANDLERS,
};
