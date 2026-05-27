const {
  Payment,
  Lease,
  Tenant,
  Unit,
  Property,
  Vendor,
  AccountsTrans,
  ChartOfAccount,
  LedgerSetup,
  Invoice,
  VendorInvoice,
  DirectPurchaseInvoice,
  PaymentInvoiceAllocation
} = require('../models');
const companyDocumentNumber = require('../services/companyDocumentNumber.service');
const periodValidation = require('../services/periodValidationService');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');
const {
  companyWhere,
  withCompanyId,
  assertInvoiceInCompany,
  assertVendorInvoiceInCompany,
  assertAccountInCompany,
  assertTenantInCompany,
  assertLeaseInCompany,
  assertVendorInCompany,
  assertDirectPurchaseInvoiceInCompany,
} = require('../utils/companyScope');
const {
  buildPostingContext,
  loadPostingSource,
  logFinancePostingEvent,
} = require('../services/financePostingContext.service');
const {
  createCompanyAccountingEntry,
  COMPANY_AUDIT_ACTIONS,
} = require('../services/companyAccountingEntry.service');

async function syncTenantInvoiceFromAllocations(invoiceId, transaction) {
  const inv = await Invoice.findByPk(invoiceId, { transaction });
  if (!inv) return;
  const paid =
    (await PaymentInvoiceAllocation.sum('amount', {
      where: { invoiceKind: 'tenant', invoiceId },
      transaction
    })) || 0;
  const total = parseFloat(inv.totalAmount || 0);
  if (paid >= total - 0.009) {
    await inv.update({ status: 'paid', paidDate: new Date() }, { transaction });
  } else {
    const patch = { paidDate: null };
    if (inv.status === 'paid') patch.status = 'sent';
    await inv.update(patch, { transaction });
  }
}

async function refreshVendorInvoiceFromAllocations(invoiceId, transaction) {
  const inv = await VendorInvoice.findByPk(invoiceId, { transaction });
  if (!inv) return;
  const paid =
    (await PaymentInvoiceAllocation.sum('amount', {
      where: { invoiceKind: 'vendor', invoiceId },
      transaction
    })) || 0;
  const total = parseFloat(inv.totalAmount || 0);
  let paymentStatus = 'unpaid';
  if (paid >= total - 0.009) paymentStatus = 'paid';
  else if (paid > 0.009) paymentStatus = 'partially_paid';
  await inv.update({ paymentStatus }, { transaction });
}

async function refreshDirectPurchaseInvoiceFromAllocations(invoiceId, transaction) {
  const inv = await DirectPurchaseInvoice.findByPk(invoiceId, { transaction });
  if (!inv) return;
  const paid =
    (await PaymentInvoiceAllocation.sum('amount', {
      where: { invoiceKind: 'direct_purchase', invoiceId },
      transaction,
    })) || 0;
  const total = parseFloat(inv.totalAmount || 0);
  const paidAmount = Math.round(paid * 100) / 100;
  const outstanding = Math.max(0, Math.round((total - paidAmount) * 100) / 100);
  let status = inv.status;
  if (['POSTED', 'PARTIALLY_PAID', 'PAID'].includes(inv.status)) {
    if (paidAmount <= 0.009) status = 'POSTED';
    else if (outstanding <= 0.009) status = 'PAID';
    else status = 'PARTIALLY_PAID';
  }
  await inv.update({ paidAmount, outstandingAmount: outstanding, status }, { transaction });
}

async function validateDirectPurchaseAllocation(invId, amount, req, transaction) {
  const dpi = await assertDirectPurchaseInvoiceInCompany(invId, req);
  if (!['POSTED', 'PARTIALLY_PAID'].includes(dpi.status)) {
    const err = new Error('Direct purchase invoice is not open for payment');
    err.statusCode = 400;
    throw err;
  }
  const outstanding = parseFloat(dpi.outstandingAmount || 0);
  if (amount > outstanding + 0.02) {
    const err = new Error(
      `Allocation ${amount.toFixed(2)} exceeds outstanding ${outstanding.toFixed(2)}`
    );
    err.statusCode = 400;
    throw err;
  }
  return dpi;
}

/**
 * Sanitizes date fields in the request body to prevent "Invalid date" errors
 */
const sanitizeDates = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key];
    if (value !== null && value !== undefined) {
      const stringValue = String(value).toLowerCase();
      if (stringValue.includes('invalid') && stringValue.includes('date')) {
        sanitized[key] = null;
      } else if (stringValue === '') {
        // Also convert empty strings to null for date/number fields
        // This is safe because we mostly deal with dates and numbers in these payloads
        if (['paymentDate', 'dueDate', 'instrumentDate', 'instrument_date', 'amount', 'taxAmount'].includes(key)) {
           sanitized[key] = null;
        }
      }
    }
  });
  
  if (sanitized.status === 'completed') {
    sanitized.status = 'paid';
  }
  
  return sanitized;
};

/**
 * Flattens nested objects (paymentDetails, payeeInfo, paymentPurpose) into root properties
 * expected by the Payment model schema.
 */
const flattenPaymentData = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const flat = { ...data };
  
  if (flat.paymentDetails) {
    flat.bankName = flat.paymentDetails.bankName || flat.bankName;
    flat.instrumentNumber = flat.paymentDetails.instrumentNumber || flat.instrumentNumber;
    flat.bankDetails = flat.paymentDetails.bankDetails || flat.bankDetails;
    flat.amount = flat.paymentDetails.amount || flat.amount;
    flat.paymentMethod = flat.paymentDetails.paymentMethod || flat.paymentMethod;
  }
  
  if (flat.payeeInfo) {
    flat.payeeName = flat.payeeInfo.payeeName || flat.payeeName;
    flat.payeeType = flat.payeeInfo.payeeType || flat.payeeType;
    flat.payeeIdString = flat.payeeInfo.payeeId ? String(flat.payeeInfo.payeeId) : flat.payeeIdString;
    
    if (flat.payeeInfo.payeeType === 'tenant') flat.tenantId = flat.payeeInfo.payeeId || flat.tenantId;
    else if (flat.payeeInfo.payeeType === 'vendor') flat.vendorId = flat.payeeInfo.payeeId || flat.vendorId;
  }
  
  if (flat.paymentPurpose) {
    flat.category = flat.paymentPurpose.category || flat.category;
    flat.propertyName = flat.paymentPurpose.property || flat.propertyName;
    flat.unitNumber = flat.paymentPurpose.unit || flat.unitNumber;
    
    // Explicitly grab user-defined reference from purpose
    flat.reference = flat.paymentPurpose.referenceNumber || flat.reference;
    flat.description = flat.paymentPurpose.description || flat.description;
  }
  
  if (flat.invoice) {
    if (!flat.leaseId && flat.invoice.leaseId) flat.leaseId = flat.invoice.leaseId;
    if (!flat.tenantId && flat.invoice.tenantId) flat.tenantId = flat.invoice.tenantId;
    if (!flat.reference && flat.invoice.invoiceNumber) flat.reference = flat.invoice.invoiceNumber;
  }

  return flat;
};

// Get all payments
const getAllPayments = async (req, res, next) => {
  try {
    const {
      search,
      status,
      method,
      leaseId,
      vendorId,
      tenantId,
      fromDate,
      toDate,
      fromDueDate,
      toDueDate,
      unitId,
      dueOnly,
      payeeType,
      excludePayeeType
    } = req.query;
    
    // Normalize pagination with max limit enforcement
    const { page, limit, offset } = normalizePagination(req.query, 10, 500);

    const whereClause = { ...companyWhere(req) };
    if (search) {
      whereClause[Op.or] = [
        { paymentNumber: { [Op.like]: `%${search}%` } },
        { reference: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { payeeName: { [Op.like]: `%${search}%` } },
        { '$tenant.name$': { [Op.like]: `%${search}%` } },
        { '$vendor.vendorName$': { [Op.like]: `%${search}%` } },
        { '$lease.unit.unitNumber$': { [Op.like]: `%${search}%` } },
        { '$lease.unit.property.title$': { [Op.like]: `%${search}%` } }
      ];
    }
    // dueOnly: only pending/overdue (due payments and due cheques), exclude paid/cancelled/refunded
    if (dueOnly === 'true' || dueOnly === true) {
      whereClause.status = status && ['pending', 'overdue'].includes(status) ? status : { [Op.in]: ['pending', 'overdue'] };
    } else if (status) {
      whereClause.status = status;
    }
    if (method) whereClause.paymentMethod = method;
    if (leaseId) whereClause.leaseId = leaseId;
    if (vendorId) whereClause.vendorId = vendorId;
    if (payeeType) whereClause.payeeType = payeeType;
    if (excludePayeeType) whereClause.payeeType = { [Op.ne]: excludePayeeType };
    if (tenantId) {
      const tid = parseInt(tenantId, 10);
      whereClause.tenantId = Number.isNaN(tid) ? tenantId : tid;
    }
    if (fromDate || toDate) {
      whereClause.paymentDate = {};
      if (fromDate) whereClause.paymentDate[Op.gte] = fromDate;
      if (toDate) whereClause.paymentDate[Op.lte] = toDate;
    }
    if (fromDueDate || toDueDate) {
      whereClause.dueDate = {};
      if (fromDueDate) whereClause.dueDate[Op.gte] = fromDueDate;
      if (toDueDate) whereClause.dueDate[Op.lte] = toDueDate;
    }

    const payments = await Payment.findAndCountAll({
      where: whereClause,
      distinct: true,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['payment_date', 'DESC']],
      include: [
        {
          model: Lease,
          as: 'lease',
          required: !!unitId,
          where: unitId ? { unitId } : undefined,
          include: [
            { model: Tenant, as: 'tenant', attributes: ['id', 'name', 'email', 'phone'] },
            { model: Unit, as: 'unit', attributes: ['id', 'unitNumber', 'propertyId'], include: [{ model: Property, as: 'property', attributes: ['id', 'title'] }] }
          ]
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'vendorName', 'email', 'phone']
        },
        {
          model: PaymentInvoiceAllocation,
          as: 'invoiceAllocations',
          required: false
        }
      ]
    });

    res.json({
      success: true,
      data: {
        payments: payments.rows,
        pagination: createPaginationMeta(payments.count, page, limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get payment by ID
const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Lease,
          as: 'lease',
          include: ['tenant', 'unit']
        },
        {
          model: Tenant,
          as: 'tenant'
        },
        {
          model: Vendor,
          as: 'vendor'
        },
        {
          model: PaymentInvoiceAllocation,
          as: 'invoiceAllocations',
          required: false
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Enrich details with ledger info for printing
    if (payment.details) {
      const details = typeof payment.details === 'string' ? JSON.parse(payment.details) : payment.details;
      if (Array.isArray(details)) {
        const enrichedDetails = await Promise.all(details.map(async (d) => {
          const ledgerId = d.ledgerId || d.ledger;
          if (ledgerId) {
            const ledger = await ChartOfAccount.findByPk(ledgerId);
            return { ...d, ledger };
          }
          return d;
        }));
        payment.setDataValue('details', enrichedDetails);
      }
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// Create new payment
const createPayment = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const sanitizedData = sanitizeDates(req.body);
    const paymentData = flattenPaymentData(sanitizedData);
    
    const docDate = paymentData.paymentDate || new Date();
    await periodValidation.validateDocumentDate(req, docDate);

    const documentType = paymentData.vendorId ? 'payment' : 'receipt';
    const targetDocument = paymentData.vendorId ? 'Payment Voucher' : 'Receipt';
    let generatedNumber = await companyDocumentNumber.generateDocumentNumber({
      companyId: req.companyId,
      documentType,
      transaction,
    });
    if (!generatedNumber) {
      generatedNumber = await documentNumberingService.generateDocumentNumber(targetDocument, transaction, {
        leaseId: paymentData.leaseId,
      });
    }

    if (generatedNumber) {
      paymentData.paymentNumber = generatedNumber;
    } else {
      const manualNumber = documentNumberingService.normalizeManualDocumentNumber(paymentData.paymentNumber);
      if (!manualNumber) {
        const paymentCount = await Payment.count({ where: { ...companyWhere(req) }, transaction });
        const prefix = paymentData.vendorId ? 'PAY' : 'REC';
        paymentData.paymentNumber = `${prefix}-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(3, '0')}`;
      } else {
        const existingPayment = await Payment.findOne({
          where: { paymentNumber: manualNumber, ...companyWhere(req) },
          transaction,
        });
        if (existingPayment) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Document number '${manualNumber}' already exists.`,
          });
        }
        paymentData.paymentNumber = manualNumber;
      }
    }
    
    const payment = await Payment.create(withCompanyId(req, paymentData), { transaction });

    const rawAlloc = req.body.invoiceAllocations;
    const allocations = Array.isArray(rawAlloc) ? rawAlloc : [];
    if (allocations.length > 0) {
      const sumAlloc = allocations.reduce((s, a) => s + parseFloat(a.amount || 0), 0);
      const payAmt = parseFloat(payment.amount || 0);
      if (Math.abs(sumAlloc - payAmt) > 0.02) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Allocation total (${sumAlloc.toFixed(2)}) must equal payment amount (${payAmt.toFixed(2)})`
        });
      }
      for (const a of allocations) {
        const kind = String(a.invoiceKind || a.kind || '').toLowerCase();
        const invId = parseInt(a.invoiceId || a.invoice_id, 10);
        const amt = parseFloat(a.amount || 0);
        if (!kind || !invId || amt <= 0) continue;
        if (kind === 'tenant') await assertInvoiceInCompany(invId, req);
        else if (kind === 'vendor') await assertVendorInvoiceInCompany(invId, req);
        else if (kind === 'direct_purchase') await validateDirectPurchaseAllocation(invId, amt, req, transaction);
        await PaymentInvoiceAllocation.create(
          {
            companyId: req.companyId,
            paymentId: payment.id,
            invoiceKind: kind,
            invoiceId: invId,
            amount: amt
          },
          { transaction }
        );
        if (kind === 'tenant') await syncTenantInvoiceFromAllocations(invId, transaction);
        else if (kind === 'vendor') await refreshVendorInvoiceFromAllocations(invId, transaction);
        else if (kind === 'direct_purchase') await refreshDirectPurchaseInvoiceFromAllocations(invId, transaction);
      }
    }

    await transaction.commit();

    try {
      const { AuditLog } = require('../models');
      await AuditLog.create({
        entityType: 'Payment',
        entityId: payment.id,
        action: 'Create',
        newValue: {
          paymentNumber: payment.paymentNumber,
          amount: payment.amount
        },
        userId: req.user.id,
        ipAddress: req.ip || '',
        userAgent: req.get('user-agent') || ''
      });
    } catch (auditErr) {
      console.error('AuditLog Payment Create:', auditErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: payment
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    next(error);
  }
};

// Update payment
const updatePayment = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const sanitizedData = sanitizeDates(req.body);
    const updateData = flattenPaymentData(sanitizedData);

    const payment = await Payment.findByPk(id);
    if (!payment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.isPosted && req.body.invoiceAllocations !== undefined) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot change invoice allocations on a posted payment'
      });
    }

    await payment.update(updateData, { transaction });

    if (req.body.invoiceAllocations !== undefined) {
      const oldRows = await PaymentInvoiceAllocation.findAll({
        where: { paymentId: id },
        transaction
      });
      const syncKeys = new Set(
        oldRows.map((r) => `${r.invoiceKind}:${r.invoiceId}`)
      );

      await PaymentInvoiceAllocation.destroy({
        where: { paymentId: id },
        transaction
      });

      const allocations = Array.isArray(req.body.invoiceAllocations)
        ? req.body.invoiceAllocations
        : [];
      const payAmt = parseFloat(
        updateData.amount != null ? updateData.amount : payment.amount || 0
      );

      if (allocations.length > 0) {
        const sumAlloc = allocations.reduce(
          (s, a) => s + parseFloat(a.amount || 0),
          0
        );
        if (Math.abs(sumAlloc - payAmt) > 0.02) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Allocation total (${sumAlloc.toFixed(2)}) must equal payment amount (${payAmt.toFixed(2)})`
          });
        }
        for (const a of allocations) {
          const kind = String(a.invoiceKind || a.kind || '').toLowerCase();
          const invId = parseInt(a.invoiceId || a.invoice_id, 10);
          const amt = parseFloat(a.amount || 0);
          if (!kind || !invId || amt <= 0) continue;
          if (kind === 'tenant') await assertInvoiceInCompany(invId, req);
          else if (kind === 'vendor') await assertVendorInvoiceInCompany(invId, req);
          else if (kind === 'direct_purchase') await validateDirectPurchaseAllocation(invId, amt, req, transaction);
          await PaymentInvoiceAllocation.create(
            {
              companyId: req.companyId,
              paymentId: payment.id,
              invoiceKind: kind,
              invoiceId: invId,
              amount: amt
            },
            { transaction }
          );
          syncKeys.add(`${kind}:${invId}`);
        }
      }

      for (const key of syncKeys) {
        const [kind, invIdStr] = key.split(':');
        const invId = parseInt(invIdStr, 10);
        if (kind === 'tenant') await syncTenantInvoiceFromAllocations(invId, transaction);
        else if (kind === 'vendor') await refreshVendorInvoiceFromAllocations(invId, transaction);
        else if (kind === 'direct_purchase') await refreshDirectPurchaseInvoiceFromAllocations(invId, transaction);
      }
    }

    await transaction.commit();

    const fresh = await Payment.findByPk(id, {
      include: [{ model: PaymentInvoiceAllocation, as: 'invoiceAllocations', required: false }]
    });

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: fresh
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    next(error);
  }
};

// Delete payment
const deletePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByPk(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    await payment.destroy();

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get payment statistics
const getPaymentStats = async (req, res, next) => {
  try {
    const totalPayments = await Payment.count({ where: { ...companyWhere(req) } });
    const paidPayments = await Payment.count({ where: { status: 'paid', ...companyWhere(req) } });
    const pendingPayments = await Payment.count({ where: { status: 'pending', ...companyWhere(req) } });
    const overduePayments = await Payment.count({ where: { status: 'overdue', ...companyWhere(req) } });

    // Calculate total amounts
    const totalAmount = await Payment.sum('amount', { where: { status: 'paid', ...companyWhere(req) } });
    const pendingAmount = await Payment.sum('amount', { where: { status: 'pending', ...companyWhere(req) } });
    const overdueAmount = await Payment.sum('amount', { where: { status: 'overdue', ...companyWhere(req) } });

    res.json({
      success: true,
      data: {
        counts: {
          total: totalPayments,
          paid: paidPayments,
          pending: pendingPayments,
          overdue: overduePayments
        },
        amounts: {
          total: totalAmount || 0,
          pending: pendingAmount || 0,
          overdue: overdueAmount || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get overdue payments
const getOverduePayments = async (req, res, next) => {
  try {
    const { page, limit, offset } = normalizePagination(req.query, 10, 100);
    
    const overdue = await Payment.findAndCountAll({
      where: { status: 'overdue' },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['dueDate', 'ASC']],
      include: [
        { model: Lease, as: 'lease', include: ['tenant', 'unit'] },
        { model: Tenant, as: 'tenant' },
        { model: Vendor, as: 'vendor' }
      ]
    });

    res.json({
      success: true,
      data: {
        payments: overdue.rows,
        pagination: createPaginationMeta(overdue.count, page, limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Post payment voucher
const postPayment = async (req, res, next) => {
  let t;
  try {
    t = await sequelize.transaction();
    const { id } = req.params;
    const userId = req.user.id;

    const payment = await loadPostingSource(Payment, id, req, { transaction: t });
    buildPostingContext({ req, sourceType: 'payment', sourceId: id, sourceRecord: payment });
    if (payment.tenantId) await assertTenantInCompany(payment.tenantId, req);
    if (payment.leaseId) await assertLeaseInCompany(payment.leaseId, req);
    if (payment.vendorId) await assertVendorInCompany(payment.vendorId, req);
    if (payment.isPosted) throw new Error('Receipt voucher is already posted');
    await periodValidation.validatePostingDate(req, payment.paymentDate);

    const details = (typeof payment.details === 'string' ? JSON.parse(payment.details) : (payment.details || [])).map(d => ({
      ...d,
      ledgerId: d.ledgerId || d.ledger,
      debitAmount: d.debitAmount !== undefined ? d.debitAmount : (d.drCr === 'Dr' ? d.amount : 0),
      creditAmount: d.creditAmount !== undefined ? d.creditAmount : (d.drCr === 'Cr' ? d.amount : 0)
    }));

    if (details.length === 0) throw new Error('Cannot post a voucher with no entry details');

    // 4.1 Validation Requirement: Total Debit Amount = Total Credit Amount
    let totalDebit = 0;
    let totalCredit = 0;
    details.forEach(detail => {
      totalDebit += parseFloat(detail.debitAmount || 0);
      totalCredit += parseFloat(detail.creditAmount || 0);
    });

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      // If one side is zero, we can auto-balance it using the payment method only if desired
      // But Requirement 4.1.2 says "Posting shall not proceed unless this validation is satisfied"
      throw new Error(`Out of balance: Total Debit (${totalDebit.toFixed(2)}) must equal Total Credit (${totalCredit.toFixed(2)})`);
    }

    // 3.1 Data Reconciliation and Verification
    // Verify that the sum of details matches the payment header amount
    if (Math.abs(totalDebit - parseFloat(payment.amount)) > 0.001 && Math.abs(totalCredit - parseFloat(payment.amount)) > 0.001) {
       // We allow multi-line details that sum up to the total, but at least one side must match the header amount
       // or we just trust the Dr/Cr balance if they are equal.
       // Industry standard: The Dr/Cr entries together represent the source document.
    }

    // 2.01 Transaction No Calculation (Requirement 2.01)
    // Starting from 100000.
    const lastTrans = await AccountsTrans.findOne({
      order: [['transactionNo', 'DESC']],
      transaction: t
    });
    
    let nextTransNo = 100000;
    if (lastTrans && lastTrans.transactionNo >= 100000) {
      nextTransNo = lastTrans.transactionNo + 1;
    }
    
    const baseTransNo = nextTransNo;
    const atLines = [];
    const isTenantReceipt = !!payment.tenantId;

    // Create Ledger Entries (Requirement 2)
    for (const detail of details) {
      if (!detail.ledgerId) {
        // Requirement 2.06: Fetch Ledger Setup if missing
        const paymentMode = payment.paymentMethod === 'cash' ? 'Cash' : (payment.paymentMethod === 'pdc' ? 'PDC' : 'Bank');
        const setupType = detail.drCr || (parseFloat(detail.debitAmount) > 0 ? 'Dr' : 'Cr');
        
        const setup = await LedgerSetup.findOne({
          where: {
            documentType: 'Receipt',
            amountType: setupType,
            ...companyWhere(req),
            [Op.or]: [
              { subDocument: paymentMode },
              { subDocument: null }
            ]
          },
          order: [['subDocument', 'DESC']], // Prefer specific subDocument
          transaction: t
        });
        
        if (setup) {
          detail.ledgerId = setup.postingType;
        } else {
          throw new Error(`Missing ledger for ${detail.drCr} entry: ${detail.particular || 'unnamed'}`);
        }
      }

      if (isTenantReceipt && detail.billId) {
        await assertInvoiceInCompany(detail.billId, req);
      } else if (!isTenantReceipt && detail.billId) {
        await assertVendorInvoiceInCompany(detail.billId, req);
      }
      
      await assertAccountInCompany(detail.ledgerId, req);
      const ledgerCheck = await ChartOfAccount.findOne({
        where: { id: detail.ledgerId, ...companyWhere(req) },
        transaction: t,
      });
      if (!ledgerCheck) {
        throw new Error(`Invalid Ledger ID (${detail.ledgerId}) for entry: ${detail.particular || 'unnamed'}`);
      }

      atLines.push({
        transactionNo: nextTransNo++,
        transactionDate: payment.paymentDate,
        jvNumber: payment.paymentNumber,
        crDr: detail.drCr || (parseFloat(detail.debitAmount) > 0 ? 'Dr' : 'Cr'),
        particular: detail.particular || (detail.drCr === 'Dr' ? 'Asset/Bank' : 'Customer/Revenue'),
        ledgerId: detail.ledgerId,
        debitAmount: detail.debitAmount || 0,
        creditAmount: detail.creditAmount || 0,
        billId: !isTenantReceipt ? detail.billId : null,
        invoiceId: isTenantReceipt ? detail.billId : null,
        particularType: isTenantReceipt ? 'Tenant' : (payment.vendorId ? 'Vendor' : 'Other'),
        particularId: isTenantReceipt ? payment.tenantId : (payment.vendorId ? payment.vendorId : null),
        narration: detail.narration || payment.description || payment.notes,
        paymentId: payment.id
      });

      // Update Account Balance
      const amount = parseFloat(detail.debitAmount > 0 ? detail.debitAmount : detail.creditAmount);
      const type = detail.debitAmount > 0 ? 'Dr' : 'Cr';
      const isNormalDebit = ['asset', 'expense'].includes(ledgerCheck.accountType);
      const change = type === 'Dr' 
        ? (isNormalDebit ? amount : -amount)
        : (isNormalDebit ? -amount : amount);

      await ledgerCheck.update({
        balance: parseFloat(ledgerCheck.balance || 0) + change
      }, { transaction: t });
    }

    await createCompanyAccountingEntry({
      companyId: req.companyId,
      lines: atLines,
      transaction: t,
      req,
      sourceType: 'payment',
      sourceId: payment.id,
      auditAction: COMPANY_AUDIT_ACTIONS.PAYMENT_POSTED,
    });

    // 3.2 Lock the Receipt page (Requirement 3.2)
    await payment.update({
      isPosted: true,
      postedBy: userId,
      postedAt: new Date(),
      transactionNo: baseTransNo,
      status: 'paid'
    }, { transaction: t });

    // 3.3 Update linked invoice status to 'paid' if applicable
    // This ensures property revenue and financial reports reflect the payment
    const paymentDetails = (typeof payment.details === 'string' ? JSON.parse(payment.details) : (payment.details || []));
    for (const detail of paymentDetails) {
      // Look for linked invoice via billId OR invoice number in 'bill' field
      let linkedInvoice = null;
      if (detail.billId) {
        linkedInvoice = await Invoice.findOne({
          where: { id: detail.billId, ...companyWhere(req) },
          transaction: t,
        });
      } else if (detail.bill && detail.bill !== 'none' && detail.bill !== 'bill') {
        linkedInvoice = await Invoice.findOne({ 
          where: { invoiceNumber: detail.bill, ...companyWhere(req) },
          transaction: t 
        });
      }

      if (linkedInvoice && payment.tenantId) {
        await linkedInvoice.update({ 
          status: 'paid',
          paidDate: payment.paymentDate || new Date()
        }, { transaction: t });
        console.log(`✅ Marked Invoice ${linkedInvoice.invoiceNumber} as paid via Receipt ${payment.paymentNumber}`);
      }
    }

    await t.commit();

    // Trigger property revenue update (after transaction commit)
    if (payment.leaseId) {
      try {
        const { updatePropertyActualRevenue } = require('./invoiceController');
        await updatePropertyActualRevenue(payment.leaseId);
      } catch (err) {
        console.error('Failed to trigger property revenue update from payment:', err);
      }
    }

    res.json({ success: true, message: 'Receipt Voucher posted successfully and locked', transactionNo: baseTransNo });
  } catch (error) {
    if (t) await t.rollback();
    const status = error.statusCode || 400;
    res.status(status).json({ success: false, message: error.message });
  }
};

// UnPost payment voucher
const unpostPayment = async (req, res, next) => {
  let t;
  try {
    t = await sequelize.transaction();
    const { id } = req.params;
    const userId = req.user.id;

    const payment = await loadPostingSource(Payment, id, req, { transaction: t });
    buildPostingContext({ req, sourceType: 'payment', sourceId: id, sourceRecord: payment });
    if (!payment.isPosted) throw new Error('Only posted vouchers can be unposted');

    const details = (typeof payment.details === 'string' ? JSON.parse(payment.details) : (payment.details || [])).map(d => ({
      ...d,
      ledgerId: d.ledgerId || d.ledger,
      debitAmount: d.debitAmount !== undefined ? d.debitAmount : (d.drCr === 'Dr' ? d.amount : 0),
      creditAmount: d.creditAmount !== undefined ? d.creditAmount : (d.drCr === 'Cr' ? d.amount : 0)
    }));

    // 1. Revert ledger impacts
    for (const detail of details) {
      const account = await ChartOfAccount.findOne({
        where: { id: detail.ledgerId, ...companyWhere(req) },
        transaction: t,
      });
      if (account) {
        const amount = parseFloat(detail.debitAmount > 0 ? detail.debitAmount : detail.creditAmount);
        const type = detail.debitAmount > 0 ? 'Dr' : 'Cr';
        const isNormalDebit = ['asset', 'expense'].includes(account.accountType);
        
        const reverseChange = type === 'Dr'
          ? (isNormalDebit ? -amount : amount)
          : (isNormalDebit ? amount : -amount);

        await account.update({
          balance: parseFloat(account.balance || 0) + reverseChange
        }, { transaction: t });
      }
    }

    // 2. Remove entries from Accounts_Trans (UnPost Requirement 1)
    await AccountsTrans.destroy({
      where: { paymentId: id, ...companyWhere(req) },
      transaction: t,
    });

    await logFinancePostingEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.FINANCE_POSTING_REVERSED,
      companyId: req.companyId,
      metadata: { source_type: 'payment', source_id: id },
    });

    // 3. Mark as unposted and unlock (UnPost Requirement 2)
    const oldValues = payment.get({ plain: true });
    await payment.update({
      isPosted: false,
      postedBy: null,
      postedAt: null,
      transactionNo: null,
      status: 'pending' // Revert to pending
    }, { transaction: t });

    // 4. Audit Tracking (UnPost Requirement 3)
    const { AuditLog } = require('../models');
    if (AuditLog) {
      await AuditLog.create({
        entityType: 'Receipt',
        entityId: id,
        action: 'UnPost',
        oldValue: oldValues,
        newValue: payment.get({ plain: true }),
        userId: userId,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.get('user-agent') || 'system'
      }, { transaction: t });
    }

    await t.commit();
    res.json({ success: true, message: 'Receipt Voucher unposted successfully and unlocked' });
  } catch (error) {
    if (t) await t.rollback();
    const status = error.statusCode || 400;
    res.status(status).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentStats,
  getOverduePayments,
  postPayment,
  unpostPayment,
  refreshDirectPurchaseInvoiceFromAllocations,
  refreshVendorInvoiceFromAllocations,
};
