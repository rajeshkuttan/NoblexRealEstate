const { Payment, Lease, Tenant, Unit, Property, Vendor, AccountsTrans, ChartOfAccount, sequelize } = require('../models');
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');

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
    const { search, status, method, leaseId, vendorId, tenantId, fromDate, toDate, fromDueDate, toDueDate, unitId, dueOnly } = req.query;
    
    // Normalize pagination with max limit enforcement
    const { page, limit, offset } = normalizePagination(req.query, 10, 100);

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { paymentNumber: { [Op.like]: `%${search}%` } },
        { reference: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
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
      limit: parseInt(limit),
      offset: parseInt(offset),
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
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
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
  try {
    console.log(`[DEBUG] Creating payment. Original body:`, req.body);
    const sanitizedData = sanitizeDates(req.body);
    const paymentData = flattenPaymentData(sanitizedData);
    console.log(`[DEBUG] Flattened & Sanitized payment data:`, paymentData);
    
    // Generate payment number
    const paymentCount = await Payment.count();
    paymentData.paymentNumber = `PAY-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(3, '0')}`;
    
    const payment = await Payment.create(paymentData);

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// Update payment
const updatePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(`[DEBUG] Updating payment ${id}. Original body:`, req.body);
    const sanitizedData = sanitizeDates(req.body);
    const updateData = flattenPaymentData(sanitizedData);
    console.log(`[DEBUG] Flattened & Sanitized update data:`, updateData);

    const payment = await Payment.findByPk(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    await payment.update(updateData);

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: payment
    });
  } catch (error) {
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
    const totalPayments = await Payment.count();
    const paidPayments = await Payment.count({ where: { status: 'paid' } });
    const pendingPayments = await Payment.count({ where: { status: 'pending' } });
    const overduePayments = await Payment.count({ where: { status: 'overdue' } });

    // Calculate total amounts
    const totalAmount = await Payment.sum('amount', { where: { status: 'paid' } });
    const pendingAmount = await Payment.sum('amount', { where: { status: 'pending' } });
    const overdueAmount = await Payment.sum('amount', { where: { status: 'overdue' } });

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
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const payment = await Payment.findByPk(id);
    if (!payment) throw new Error('Payment voucher not found');
    if (payment.isPosted) throw new Error('Payment voucher is already posted');

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
      // If one side is zero, we can auto-balance it using the payment method
      // This is a safety net for vouchers created with only one side
      if (totalCredit === 0 || totalDebit === 0) {
        const balance = Math.abs(totalDebit - totalCredit);
        const side = totalDebit > totalCredit ? 'Cr' : 'Dr';
        
        // Determine source ledger based on payment method
        let sourceLedgerId = null;
        if (payment.paymentMethod === 'cash') {
          // Find a cash/petty cash account
          const cashAcc = await ChartOfAccount.findOne({
            where: {
              [Op.or]: [
                { accountName: { [Op.like]: '%Cash%' } },
                { accountType: 'cash' }
              ]
            }
          });
          sourceLedgerId = cashAcc ? cashAcc.id : null;
        } else {
          // Find a bank account
          const bankAcc = await ChartOfAccount.findOne({
            where: {
              [Op.or]: [
                { accountName: { [Op.like]: '%Bank%' } },
                { accountType: { [Op.like]: '%Bank%' } }
              ]
            }
          });
          sourceLedgerId = bankAcc ? bankAcc.id : null;
        }

        if (sourceLedgerId) {
          details.push({
            ledgerId: sourceLedgerId,
            debitAmount: side === 'Dr' ? balance : 0,
            creditAmount: side === 'Cr' ? balance : 0,
            particular: 'System Auto-Balance',
            notes: `Auto-balancing ${payment.paymentMethod} entry`
          });
          // Re-calculate totals (just to be safe, though we know it balances now)
          totalDebit = 0;
          totalCredit = 0;
          details.forEach(detail => {
            totalDebit += parseFloat(detail.debitAmount || 0);
            totalCredit += parseFloat(detail.creditAmount || 0);
          });
        }
      }

      if (Math.abs(totalDebit - totalCredit) > 0.001) {
        throw new Error(`Out of balance: Total Debit (${totalDebit.toFixed(2)}) must equal Total Credit (${totalCredit.toFixed(2)})`);
      }
    }

    // Get the next transaction number (Requirement 2.01)
    const lastTrans = await AccountsTrans.findOne({
      order: [['transactionNo', 'DESC']],
      transaction: t
    });
    let nextTransNo = lastTrans ? (lastTrans.transactionNo < 100000 ? 100000 : lastTrans.transactionNo + 1) : 100000;
    const baseTransNo = nextTransNo;
    // Create Ledger Entries and Update Balances
    for (const detail of details) {
      if (!detail.ledgerId) {
        throw new Error(`Missing ledger for entry: ${detail.particular || 'unnamed'}`);
      }
      
      // 0. Verify Ledger exists in Chart of Accounts (Requirement: Stability)
      const ledgerCheck = await ChartOfAccount.findByPk(detail.ledgerId, { autoRotate: true });
      if (!ledgerCheck) {
        throw new Error(`Invalid Ledger ID (${detail.ledgerId}) for entry: ${detail.particular || 'unnamed'}. Please re-select the account in the grid.`);
      }

      // 1. Transaction Creation (Requirement 2)
      await AccountsTrans.create({
        transactionNo: nextTransNo++,
        transactionDate: payment.paymentDate,
        paymentId: payment.id,
        crDr: parseFloat(detail.debitAmount) > 0 ? 'Dr' : 'Cr',
        particular: detail.particularType ? `${detail.particularType}: ${detail.particularName || detail.particularId || ''}` : payment.paymentNumber,
        ledgerId: detail.ledgerId,
        debitAmount: detail.debitAmount || 0,
        creditAmount: detail.creditAmount || 0,
        narration: detail.notes || payment.description,
      }, { transaction: t });

      // Update Account Balance
      const account = await ChartOfAccount.findByPk(detail.ledgerId, { transaction: t });
      if (account) {
        const amount = parseFloat(detail.debitAmount > 0 ? detail.debitAmount : detail.creditAmount);
        const type = detail.debitAmount > 0 ? 'Dr' : 'Cr';
        const isNormalDebit = ['asset', 'expense'].includes(account.accountType);
        const change = type === 'Dr' 
          ? (isNormalDebit ? amount : -amount)
          : (isNormalDebit ? -amount : amount);

        await account.update({
          balance: parseFloat(account.balance || 0) + change
        }, { transaction: t });
      }
    }

    // Update Payment status and lock (Requirement 3.2)
    await payment.update({
      isPosted: true,
      postedBy: userId,
      postedAt: new Date(),
      transactionNo: baseTransNo,
      status: 'paid' // Automatically mark as paid on post if it wasn't already
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: 'Payment Voucher posted successfully and locked' });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ success: false, message: error.message });
  }
};

// UnPost payment voucher
const unpostPayment = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const payment = await Payment.findByPk(id);
    if (!payment) throw new Error('Payment voucher not found');
    if (!payment.isPosted) throw new Error('Only posted vouchers can be unposted');

    const details = (typeof payment.details === 'string' ? JSON.parse(payment.details) : (payment.details || [])).map(d => ({
      ...d,
      ledgerId: d.ledgerId || d.ledger,
      debitAmount: d.debitAmount !== undefined ? d.debitAmount : (d.drCr === 'Dr' ? d.amount : 0),
      creditAmount: d.creditAmount !== undefined ? d.creditAmount : (d.drCr === 'Cr' ? d.amount : 0)
    }));

    // 1. Revert ledger impacts
    for (const detail of details) {
      const account = await ChartOfAccount.findByPk(detail.ledgerId, { transaction: t });
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

    // 1. Remove entries from Accounts_Trans (UnPost Requirement 1)
    await AccountsTrans.destroy({ where: { paymentId: id }, transaction: t });

    // 2. Mark as unposted and unlock (UnPost Requirement 2)
    await payment.update({
      isPosted: false,
      postedBy: null,
      postedAt: null,
      transactionNo: null,
      status: 'pending' // Revert to pending
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: 'Payment Voucher unposted successfully and unlocked' });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ success: false, message: error.message });
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
  unpostPayment
};
