'use strict';

const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const {
  PrepaidExpense,
  PrepaidExpenseScheduleLine,
  PrepaidExpenseReconciliation,
} = require('../../models');
const { companyWhere } = require('../../utils/companyScope');

const REPORT_HANDLERS = {
  register: fetchRegister,
  schedule: fetchScheduleReport,
  monthly_recognition: fetchMonthlyRecognition,
  remaining: fetchRemaining,
  reconciliation: fetchReconciliationReport,
  expiring: fetchExpiring,
  exceptions: fetchExceptions,
};

async function fetchRegister(req, query) {
  const where = { ...companyWhere(req) };
  if (query.status) where.status = query.status;
  return PrepaidExpense.findAll({ where, order: [['prepaidNumber', 'ASC']] });
}

async function fetchScheduleReport(req, query) {
  const where = { ...companyWhere(req) };
  if (query.prepaidExpenseId) where.prepaidExpenseId = query.prepaidExpenseId;
  return PrepaidExpenseScheduleLine.findAll({
    where,
    include: [{ model: PrepaidExpense, as: 'prepaidExpense', attributes: ['prepaidNumber', 'description'] }],
    order: [['prepaidExpenseId', 'ASC'], ['lineNumber', 'ASC']],
  });
}

async function fetchMonthlyRecognition(req, query) {
  const where = { ...companyWhere(req), postingStatus: 'POSTED' };
  if (query.recognitionMonth) where.recognitionMonth = query.recognitionMonth;
  return PrepaidExpenseScheduleLine.findAll({
    where,
    include: [{ model: PrepaidExpense, as: 'prepaidExpense', attributes: ['prepaidNumber'] }],
    order: [['recognitionMonth', 'ASC']],
  });
}

async function fetchRemaining(req) {
  return PrepaidExpense.findAll({
    where: {
      ...companyWhere(req),
      status: { [Op.in]: ['ACTIVE', 'PARTIALLY_RECOGNIZED', 'SUSPENDED'] },
    },
    attributes: ['id', 'prepaidNumber', 'description', 'totalAmount', 'recognizedAmount', 'remainingAmount', 'serviceEndDate'],
    order: [['remainingAmount', 'DESC']],
  });
}

async function fetchReconciliationReport(req) {
  return PrepaidExpenseReconciliation.findAll({
    where: companyWhere(req),
    order: [['reconciliationDate', 'DESC']],
    limit: 200,
  });
}

async function fetchExpiring(req, query) {
  const days = parseInt(query.withinDays, 10) || 90;
  const until = new Date();
  until.setUTCDate(until.getUTCDate() + days);
  const untilStr = until.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  return PrepaidExpense.findAll({
    where: {
      ...companyWhere(req),
      status: { [Op.in]: ['ACTIVE', 'PARTIALLY_RECOGNIZED'] },
      serviceEndDate: { [Op.between]: [today, untilStr] },
    },
    order: [['serviceEndDate', 'ASC']],
  });
}

async function fetchExceptions(req) {
  return PrepaidExpenseScheduleLine.findAll({
    where: {
      ...companyWhere(req),
      postingStatus: { [Op.in]: ['FAILED', 'BLOCKED'] },
    },
    include: [{ model: PrepaidExpense, as: 'prepaidExpense', attributes: ['prepaidNumber'] }],
  });
}

function rowsToSheet(rows, type) {
  if (!rows?.length) return [{ message: 'No data' }];
  if (type === 'register') {
    return rows.map((r) => ({
      Number: r.prepaidNumber,
      Status: r.status,
      Amount: r.totalAmount,
      Remaining: r.remainingAmount,
      Start: r.serviceStartDate,
      End: r.serviceEndDate,
    }));
  }
  if (type === 'schedule' || type === 'monthly_recognition' || type === 'exceptions') {
    return rows.map((r) => ({
      Prepaid: r.prepaidExpense?.prepaidNumber,
      Line: r.lineNumber,
      Month: r.recognitionMonth,
      Amount: r.scheduledAmount,
      Status: r.postingStatus,
      Period: `${r.periodStartDate} — ${r.periodEndDate}`,
    }));
  }
  if (type === 'remaining' || type === 'expiring') {
    return rows.map((r) => ({
      Number: r.prepaidNumber,
      Description: r.description,
      Remaining: r.remainingAmount,
      End: r.serviceEndDate,
    }));
  }
  if (type === 'reconciliation') {
    return rows.map((r) => ({
      Date: r.reconciliationDate,
      PrepaidId: r.prepaidExpenseId,
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

    doc.fontSize(14).text(title || `Prepaid Report — ${type}`, { underline: true });
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
      filename: `prepaid-${type}.xlsx`,
      body: buildExcelBuffer(data, type),
    };
  }
  if (format === 'csv') {
    return {
      contentType: 'text/csv',
      filename: `prepaid-${type}.csv`,
      body: buildCsvBuffer(data, type),
    };
  }
  if (format === 'pdf') {
    return {
      contentType: 'application/pdf',
      filename: `prepaid-${type}.pdf`,
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
