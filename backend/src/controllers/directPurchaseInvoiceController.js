/**
 * Direct Purchase Invoice — expense booking with input VAT and vendor payable (AccountsTrans).
 */

const { Op } = require('sequelize');
const {
  DirectPurchaseInvoice,
  DirectPurchaseInvoiceLine,
  Vendor,
  User,
  ChartOfAccount,
  LedgerSetup,
  AccountsTrans,
  sequelize,
} = require('../models');
const companyDocumentNumber = require('../services/companyDocumentNumber.service');
const periodValidation = require('../services/periodValidationService');
const vatPeriodService = require('../services/vatPeriodService');
const {
  companyWhere,
  withCompanyId,
  stripCompanyFromBody,
  assertRecordInCompany,
  assertVendorInCompany,
  assertAccountInCompany,
} = require('../utils/companyScope');
const { buildPostingContext, loadPostingSource } = require('../services/financePostingContext.service');
const {
  createCompanyAccountingEntry,
  COMPANY_AUDIT_ACTIONS,
} = require('../services/companyAccountingEntry.service');
const { logCompanyEvent } = require('../services/companyAuditService');

function round2(n) {
  return Math.round((parseFloat(n) || 0) * 100) / 100;
}

function computeLineTotals(line) {
  const amount = round2(line.amount);
  const taxRate = parseFloat(line.taxRate ?? line.tax_rate ?? 0) || 0;
  const taxAmount =
    line.taxAmount != null ? round2(line.taxAmount) : round2((amount * taxRate) / 100);
  const totalAmount = round2(amount + taxAmount);
  return { amount, taxRate, taxAmount, totalAmount };
}

function summarizeLines(lines) {
  let subtotal = 0;
  let tax = 0;
  for (const line of lines) {
    const t = computeLineTotals(line);
    subtotal += t.amount;
    tax += t.taxAmount;
  }
  subtotal = round2(subtotal);
  tax = round2(tax);
  return { subtotalAmount: subtotal, taxAmount: tax, totalAmount: round2(subtotal + tax) };
}

async function generateDpiNumber(req, transaction) {
  let num = await companyDocumentNumber.generateDocumentNumber({
    companyId: req.companyId,
    documentType: 'direct_purchase_invoice',
    transaction,
  });
  if (!num) {
    const count = await DirectPurchaseInvoice.count({ where: { ...companyWhere(req) }, transaction });
    num = `DPI-${String(count + 1).padStart(6, '0')}`;
  }
  return num;
}

async function resolvePayableAccountId(req, transaction) {
  const setup = await LedgerSetup.findOne({
    where: { documentType: 'Purchase Invoice', amountType: 'Cr', ...companyWhere(req) },
    transaction,
  });
  if (setup?.postingType) {
    await assertAccountInCompany(setup.postingType, req);
    return setup.postingType;
  }
  const ap = await ChartOfAccount.findOne({
    where: {
      ...companyWhere(req),
      accountType: 'liability',
      accountName: { [Op.like]: '%payable%' },
    },
    transaction,
  });
  if (ap) return ap.id;
  throw new Error(
    'Vendor payable account not configured. Set Ledger Setup for Purchase Invoice (Cr) or create an Accounts Payable account.'
  );
}

async function resolvePayableIdForDpi(dpi, req, transaction) {
  if (dpi.payableAccountId) {
    await assertAccountInCompany(dpi.payableAccountId, req);
    return dpi.payableAccountId;
  }
  return resolvePayableAccountId(req, transaction);
}

async function validateDpiPostingAccounts(dpi, lines, req, transaction) {
  try {
    await resolvePayableIdForDpi(dpi, req, transaction);
  } catch (e) {
    throw new Error(
      `${e.message || e}. Select a vendor payable account on the invoice or configure Ledger Setup for Purchase Invoice (Cr).`
    );
  }
  for (const line of lines) {
    if (round2(line.taxAmount) > 0) {
      try {
        await resolveInputVatAccountId(req, line, transaction);
      } catch (e) {
        throw new Error(
          `Input VAT account required for taxable line (amount ${round2(line.amount)}). Select Input VAT ledger on the line or configure Ledger Setup for Purchase Invoice (Tax).`
        );
      }
    }
  }
}

async function resolveInputVatAccountId(req, line, transaction) {
  if (line.inputTaxAccountId) {
    await assertAccountInCompany(line.inputTaxAccountId, req);
    return line.inputTaxAccountId;
  }
  const setup = await LedgerSetup.findOne({
    where: { documentType: 'Purchase Invoice', calculationOn: 'Tax', ...companyWhere(req) },
    transaction,
  });
  if (setup?.postingType) {
    await assertAccountInCompany(setup.postingType, req);
    return setup.postingType;
  }
  const vat = await ChartOfAccount.findOne({
    where: {
      ...companyWhere(req),
      accountName: { [Op.like]: '%VAT%' },
      accountType: { [Op.in]: ['asset', 'liability'] },
    },
    transaction,
  });
  if (vat) return vat.id;
  throw new Error('Input VAT account not configured for tax line');
}

async function validateDpiDate(req, invoiceDate, hasTax) {
  await periodValidation.validateDocumentDate(req, invoiceDate);
  if (hasTax) {
    await vatPeriodService.assertVatPeriodEditable(req.companyId, invoiceDate, { req });
  }
}

async function persistLines(invoiceId, req, rawLines, transaction) {
  await DirectPurchaseInvoiceLine.destroy({
    where: { directPurchaseInvoiceId: invoiceId, ...companyWhere(req) },
    transaction,
  });
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    throw new Error('At least one line is required');
  }
  for (const raw of rawLines) {
    const t = computeLineTotals(raw);
    await assertAccountInCompany(raw.expenseAccountId ?? raw.expense_account_id, req);
    await DirectPurchaseInvoiceLine.create(
      withCompanyId(req, {
        directPurchaseInvoiceId: invoiceId,
        expenseAccountId: raw.expenseAccountId ?? raw.expense_account_id,
        description: raw.description || null,
        amount: t.amount,
        taxCode: raw.taxCode ?? raw.tax_code ?? null,
        taxRate: t.taxRate,
        taxAmount: t.taxAmount,
        totalAmount: t.totalAmount,
        inputTaxAccountId: raw.inputTaxAccountId ?? raw.input_tax_account_id ?? null,
        costCenterId: raw.costCenterId ?? raw.cost_center_id ?? null,
        propertyId: raw.propertyId ?? raw.property_id ?? null,
        unitId: raw.unitId ?? raw.unit_id ?? null,
        leaseId: raw.leaseId ?? raw.lease_id ?? null,
      }),
      { transaction }
    );
  }
}

async function getNextTransactionNo(transaction) {
  const last = await AccountsTrans.findOne({
    order: [['transactionNo', 'DESC']],
    transaction,
  });
  if (!last || !last.transactionNo || last.transactionNo < 100000) return 100000;
  return last.transactionNo + 1;
}

async function postDpiAccounting(dpi, lines, req, transaction) {
  buildPostingContext({
    req,
    sourceType: 'direct_purchase_invoice',
    sourceId: dpi.id,
    sourceRecord: dpi,
  });
  await assertVendorInCompany(dpi.vendorId, req);
  const payableId = await resolvePayableIdForDpi(dpi, req, transaction);
  const invoiceDate = dpi.invoiceDate;
  let baseTransNo = await getNextTransactionNo(transaction);
  let nextNo = baseTransNo;
  const atLines = [];
  let totalDr = 0;
  let totalCr = 0;

  for (const line of lines) {
    const amt = round2(line.amount);
    const tax = round2(line.taxAmount);
    if (amt > 0) {
      await assertAccountInCompany(line.expenseAccountId, req);
      atLines.push({
        transactionNo: nextNo++,
        transactionDate: invoiceDate,
        jvNumber: dpi.dpiNumber,
        crDr: 'Dr',
        particular: line.description || 'Expense',
        ledgerId: line.expenseAccountId,
        debitAmount: amt,
        creditAmount: 0,
        directPurchaseInvoiceId: dpi.id,
        particularType: 'Vendor',
        particularId: dpi.vendorId,
        narration: dpi.description || `DPI ${dpi.dpiNumber}`,
      });
      totalDr += amt;
    }
    if (tax > 0) {
      const taxAcct = await resolveInputVatAccountId(req, line, transaction);
      atLines.push({
        transactionNo: nextNo++,
        transactionDate: invoiceDate,
        jvNumber: dpi.dpiNumber,
        crDr: 'Dr',
        particular: 'Input VAT',
        ledgerId: taxAcct,
        debitAmount: tax,
        creditAmount: 0,
        directPurchaseInvoiceId: dpi.id,
        particularType: 'Vendor',
        particularId: dpi.vendorId,
        narration: `Input VAT - ${dpi.dpiNumber}`,
      });
      totalDr += tax;
    }
  }

  const total = round2(dpi.totalAmount);
  atLines.push({
    transactionNo: nextNo++,
    transactionDate: invoiceDate,
    jvNumber: dpi.dpiNumber,
    crDr: 'Cr',
    particular: 'Vendor Payable',
    ledgerId: payableId,
    debitAmount: 0,
    creditAmount: total,
    directPurchaseInvoiceId: dpi.id,
    particularType: 'Vendor',
    particularId: dpi.vendorId,
    narration: `Vendor payable - ${dpi.dpiNumber}`,
  });
  totalCr += total;

  if (Math.abs(totalDr - totalCr) > 0.02) {
    throw new Error(`Posting out of balance: Dr ${totalDr} Cr ${totalCr}`);
  }

  await createCompanyAccountingEntry({
    companyId: req.companyId,
    lines: atLines,
    transaction,
    req,
    sourceType: 'direct_purchase_invoice',
    sourceId: dpi.id,
    auditAction: COMPANY_AUDIT_ACTIONS.DIRECT_PURCHASE_INVOICE_POSTED,
  });

  return baseTransNo;
}

exports.getAll = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      vendor_id: vendorId,
      status,
      from_date: fromDate,
      to_date: toDate,
      outstanding_only: outstandingOnly,
    } = req.query;
    const where = { ...companyWhere(req) };
    if (vendorId) where.vendorId = vendorId;
    if (status) where.status = status;
    if (outstandingOnly === 'true') {
      where.outstandingAmount = { [Op.gt]: 0 };
      where.status = { [Op.in]: ['POSTED', 'PARTIALLY_PAID'] };
    }
    if (fromDate && toDate) {
      where.invoiceDate = { [Op.between]: [fromDate, toDate] };
    } else if (fromDate) {
      where.invoiceDate = { [Op.gte]: fromDate };
    } else if (toDate) {
      where.invoiceDate = { [Op.lte]: toDate };
    }

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const { count, rows } = await DirectPurchaseInvoice.findAndCountAll({
      where,
      include: [{ model: Vendor, as: 'vendor', attributes: ['id', 'vendorName'] }],
      order: [['invoiceDate', 'DESC'], ['id', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });
    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(count / parseInt(limit, 10)),
      },
    });
  } catch (e) {
    next(e);
  }
};

exports.getOpenPayables = async (req, res, next) => {
  try {
    const { vendor_id: vendorId } = req.query;
    const where = {
      ...companyWhere(req),
      status: { [Op.in]: ['POSTED', 'PARTIALLY_PAID'] },
      outstandingAmount: { [Op.gt]: 0 },
    };
    if (vendorId) where.vendorId = vendorId;
    const rows = await DirectPurchaseInvoice.findAll({
      where,
      include: [{ model: Vendor, as: 'vendor', attributes: ['id', 'vendorName'] }],
      order: [['dueDate', 'ASC'], ['invoiceDate', 'ASC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const invoice = await DirectPurchaseInvoice.findOne({
      where: { id: req.params.id, ...companyWhere(req) },
      include: [
        { model: Vendor, as: 'vendor' },
        {
          model: ChartOfAccount,
          as: 'payableAccount',
          attributes: ['id', 'accountCode', 'accountName'],
        },
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        {
          model: DirectPurchaseInvoiceLine,
          as: 'lines',
          include: [
            { model: ChartOfAccount, as: 'expenseAccount', attributes: ['id', 'accountCode', 'accountName'] },
            { model: ChartOfAccount, as: 'inputTaxAccount', attributes: ['id', 'accountCode', 'accountName'] },
          ],
        },
        {
          model: AccountsTrans,
          as: 'accountingEntries',
          required: false,
          include: [{ model: ChartOfAccount, as: 'ledger', attributes: ['id', 'accountCode', 'accountName'] }],
        },
      ],
    });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Direct purchase invoice not found' });
    }
    res.json({ success: true, data: invoice });
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const body = stripCompanyFromBody(req.body);
    const lines = body.lines || [];
    const totals = summarizeLines(lines);
    await assertVendorInCompany(body.vendorId, req);
    await validateDpiDate(req, body.invoiceDate, totals.taxAmount > 0);
    if (body.payableAccountId) {
      await assertAccountInCompany(body.payableAccountId, req);
    }

    const dpiNumber = await generateDpiNumber(req, t);
    const invoice = await DirectPurchaseInvoice.create(
      withCompanyId(req, {
        dpiNumber,
        vendorId: body.vendorId,
        invoiceDate: body.invoiceDate,
        dueDate: body.dueDate || body.invoiceDate,
        supplierInvoiceNo: body.supplierInvoiceNo || null,
        supplierInvoiceDate: body.supplierInvoiceDate || null,
        currency: body.currency || 'AED',
        exchangeRate: body.exchangeRate || 1,
        subtotalAmount: totals.subtotalAmount,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        paidAmount: 0,
        outstandingAmount: 0,
        status: 'DRAFT',
        description: body.description || null,
        payableAccountId: body.payableAccountId || null,
        createdBy: req.user.id,
      }),
      { transaction: t }
    );
    await persistLines(invoice.id, req, lines, t);
    await t.commit();

    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.DIRECT_PURCHASE_INVOICE_CREATED,
      entityId: req.companyId,
      metadata: {
        company_id: req.companyId,
        vendor_id: invoice.vendorId,
        dpi_id: invoice.id,
        dpi_number: invoice.dpiNumber,
        total_amount: invoice.totalAmount,
        status: invoice.status,
      },
    });

    const full = await DirectPurchaseInvoice.findByPk(invoice.id, {
      include: [{ model: DirectPurchaseInvoiceLine, as: 'lines' }],
    });
    res.status(201).json({ success: true, data: full });
  } catch (e) {
    await t.rollback();
    next(e);
  }
};

exports.update = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const invoice = await assertRecordInCompany(DirectPurchaseInvoice, req.params.id, req, {
      transaction: t,
    });
    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Only draft invoices can be edited' });
    }
    const body = stripCompanyFromBody(req.body);
    const lines = body.lines || [];
    const totals = summarizeLines(lines);
    if (body.vendorId) await assertVendorInCompany(body.vendorId, req);
    await validateDpiDate(req, body.invoiceDate || invoice.invoiceDate, totals.taxAmount > 0);
    if (body.payableAccountId) {
      await assertAccountInCompany(body.payableAccountId, req);
    }

    await invoice.update(
      {
        vendorId: body.vendorId ?? invoice.vendorId,
        invoiceDate: body.invoiceDate ?? invoice.invoiceDate,
        dueDate: body.dueDate ?? invoice.dueDate,
        supplierInvoiceNo: body.supplierInvoiceNo ?? invoice.supplierInvoiceNo,
        supplierInvoiceDate: body.supplierInvoiceDate ?? invoice.supplierInvoiceDate,
        currency: body.currency ?? invoice.currency,
        exchangeRate: body.exchangeRate ?? invoice.exchangeRate,
        subtotalAmount: totals.subtotalAmount,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        description: body.description ?? invoice.description,
        payableAccountId:
          body.payableAccountId !== undefined ? body.payableAccountId : invoice.payableAccountId,
      },
      { transaction: t }
    );
    if (body.lines) await persistLines(invoice.id, req, lines, t);
    await t.commit();

    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.DIRECT_PURCHASE_INVOICE_UPDATED,
      entityId: req.companyId,
      metadata: { dpi_id: invoice.id, dpi_number: invoice.dpiNumber, status: invoice.status },
    });

    const full = await DirectPurchaseInvoice.findOne({
      where: { id: invoice.id, ...companyWhere(req) },
      include: [{ model: DirectPurchaseInvoiceLine, as: 'lines' }],
    });
    res.json({ success: true, data: full });
  } catch (e) {
    await t.rollback();
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const invoice = await assertRecordInCompany(DirectPurchaseInvoice, req.params.id, req);
    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Only draft invoices can be deleted' });
    }
    await DirectPurchaseInvoiceLine.destroy({
      where: { directPurchaseInvoiceId: invoice.id, ...companyWhere(req) },
    });
    await invoice.destroy();
    res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    next(e);
  }
};

exports.post = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const invoice = await loadPostingSource(DirectPurchaseInvoice, req.params.id, req, {
      transaction: t,
      include: [{ model: DirectPurchaseInvoiceLine, as: 'lines' }],
    });
    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Invoice is not in draft status' });
    }
    const lines = invoice.lines || [];
    if (!lines.length) throw new Error('Cannot post without lines');

    await periodValidation.validatePostingDate(req, invoice.invoiceDate);
    if (round2(invoice.taxAmount) > 0) {
      await vatPeriodService.assertVatPeriodEditable(req.companyId, invoice.invoiceDate, { req });
    }

    await validateDpiPostingAccounts(invoice, lines, req, t);
    const baseTransNo = await postDpiAccounting(invoice, lines, req, t);
    const total = round2(invoice.totalAmount);
    await invoice.update(
      {
        status: 'POSTED',
        outstandingAmount: total,
        paidAmount: 0,
        postedBy: req.user.id,
        postedAt: new Date(),
        transactionNo: baseTransNo,
      },
      { transaction: t }
    );
    await t.commit();
    res.json({ success: true, message: 'Posted', data: { transactionNo: baseTransNo } });
  } catch (e) {
    await t.rollback();
    const status = e.statusCode || 400;
    res.status(status).json({ success: false, message: e.message });
  }
};

exports.cancel = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const invoice = await loadPostingSource(DirectPurchaseInvoice, req.params.id, req, {
      transaction: t,
      include: [{ model: DirectPurchaseInvoiceLine, as: 'lines' }],
    });
    if (invoice.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Already cancelled' });
    }
    if (parseFloat(invoice.paidAmount) > 0.009) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel invoice with payments applied',
      });
    }

    if (invoice.status === 'DRAFT') {
      await invoice.update(
        { status: 'CANCELLED', cancelledBy: req.user.id, cancelledAt: new Date() },
        { transaction: t }
      );
      await t.commit();
      return res.json({ success: true, message: 'Cancelled' });
    }

    await periodValidation.validatePostingDate(req, invoice.invoiceDate);
    const existing = await AccountsTrans.findAll({
      where: { directPurchaseInvoiceId: invoice.id, ...companyWhere(req) },
      transaction: t,
    });
    if (existing.length) {
      let baseTransNo = await getNextTransactionNo(t);
      let nextNo = baseTransNo;
      const reversalLines = existing.map((row) => ({
        transactionNo: nextNo++,
        transactionDate: invoice.invoiceDate,
        jvNumber: `${invoice.dpiNumber}-REV`,
        crDr: row.crDr === 'Dr' ? 'Cr' : 'Dr',
        particular: `Reversal: ${row.particular || ''}`,
        ledgerId: row.ledgerId,
        debitAmount: parseFloat(row.creditAmount) || 0,
        creditAmount: parseFloat(row.debitAmount) || 0,
        directPurchaseInvoiceId: invoice.id,
        particularType: 'Vendor',
        particularId: invoice.vendorId,
        narration: `Cancel ${invoice.dpiNumber}`,
      }));
      await createCompanyAccountingEntry({
        companyId: req.companyId,
        lines: reversalLines,
        transaction: t,
        req,
        sourceType: 'direct_purchase_invoice',
        sourceId: invoice.id,
        auditAction: COMPANY_AUDIT_ACTIONS.FINANCE_POSTING_REVERSED,
      });
    }

    await invoice.update(
      {
        status: 'CANCELLED',
        outstandingAmount: 0,
        cancelledBy: req.user.id,
        cancelledAt: new Date(),
      },
      { transaction: t }
    );
    await t.commit();

    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.DIRECT_PURCHASE_INVOICE_CANCELLED,
      entityId: req.companyId,
      metadata: { dpi_id: invoice.id, dpi_number: invoice.dpiNumber },
    });

    res.json({ success: true, message: 'Cancelled and reversed' });
  } catch (e) {
    await t.rollback();
    const status = e.statusCode || 400;
    res.status(status).json({ success: false, message: e.message });
  }
};

exports.computeLineTotals = computeLineTotals;
exports.summarizeLines = summarizeLines;
exports.resolvePayableIdForDpi = resolvePayableIdForDpi;
exports.validateDpiPostingAccounts = validateDpiPostingAccounts;
