const { JournalVoucher, JournalVoucherDetail, FinancialTransaction, ChartOfAccount, VendorInvoice, AccountsTrans, Property, sequelize } = require('../models');
const { Op } = require('sequelize');
const companyDocumentNumber = require('../services/companyDocumentNumber.service');
const documentNumberingService = require('../services/documentNumberingService');
const periodValidation = require('../services/periodValidationService');
const {
  companyWhere,
  withCompanyId,
  assertAccountInCompany,
  assertVendorInCompany,
  assertVendorInvoiceInCompany,
} = require('../utils/companyScope');
const {
  buildPostingContext,
  loadPostingSource,
  logFinancePostingEvent,
} = require('../services/financePostingContext.service');
const {
  createCompanyAccountingEntry,
  createCompanyFinancialTransaction,
  COMPANY_AUDIT_ACTIONS,
} = require('../services/companyAccountingEntry.service');

async function resolveJournalVoucherNumber(rawNumber, propertyId, transaction) {
  const generatedNumber = await documentNumberingService.generateDocumentNumber('Journal Voucher', transaction, { propertyId });
  if (generatedNumber) {
    return generatedNumber;
  }

  const manualNumber = documentNumberingService.normalizeManualDocumentNumber(rawNumber);
  if (!manualNumber) {
    const error = new Error('Document numbering is disabled for Journal Voucher. Please enter the JV number manually.');
    error.statusCode = 400;
    throw error;
  }

  const existingVoucher = await JournalVoucher.findOne({
    where: { jvNumber: manualNumber },
    transaction
  });

  if (existingVoucher) {
    const error = new Error(`Journal Voucher number '${manualNumber}' already exists.`);
    error.statusCode = 400;
    throw error;
  }

  return manualNumber;
}

// Get all journal vouchers
const getAllJournalVouchers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { ...companyWhere(req) };
    if (search) {
      whereClause[Op.or] = [
        { jvNumber: { [Op.like]: `%${search}%` } },
        { narration: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const vouchers = await JournalVoucher.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['date', 'DESC'], ['id', 'DESC']],
      distinct: true,
      include: [
        {
          model: JournalVoucherDetail,
          as: 'details',
          include: [{ model: ChartOfAccount, as: 'ledger' }]
        }
      ]
    });

    res.json({
      success: true,
      data: {
        vouchers: vouchers.rows,
        pagination: {
          total: vouchers.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(vouchers.count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get voucher by ID
const getJournalVoucherById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const voucher = await JournalVoucher.findOne({
      where: { id, ...companyWhere(req) },
      include: [
        {
          model: JournalVoucherDetail,
          as: 'details',
          include: [{ model: ChartOfAccount, as: 'ledger' }]
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'plotNumber'],
          required: false
        }
      ]
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Journal Voucher not found'
      });
    }

    res.json({
      success: true,
      data: voucher
    });
  } catch (error) {
    next(error);
  }
};

// Create new journal voucher
const createJournalVoucher = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { date, narration, details, propertyId, jvNumber: rawJvNumber } = req.body;
    const createdBy = req.user.id;

    if (!details || !Array.isArray(details) || details.length === 0) {
      throw new Error('Voucher details are required');
    }

    for (const detail of details) {
      await assertAccountInCompany(detail.ledgerId, req);
      if (detail.particularType === 'Supplier' && detail.particularId) {
        await assertVendorInCompany(detail.particularId, req);
      }
    }

    // Calculate totals and validate balance
    let totalDebit = 0;
    let totalCredit = 0;

    details.forEach(detail => {
      if (detail.type === 'Dr') {
        totalDebit += parseFloat(detail.debitAmount || 0);
      } else {
        totalCredit += parseFloat(detail.creditAmount || 0);
      }
    });

    // Handle floating point precision issues
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new Error(`Out of balance: Total Debit (${totalDebit.toFixed(2)}) must equal Total Credit (${totalCredit.toFixed(2)})`);
    }

    await periodValidation.validateDocumentDate(req, date);

    let jvNumber = await companyDocumentNumber.generateDocumentNumber({
      companyId: req.companyId,
      documentType: 'journal_voucher',
      transaction: t,
    });
    if (!jvNumber) {
      jvNumber = await resolveJournalVoucherNumber(rawJvNumber, propertyId, t);
    }

    // Create Voucher
    const voucher = await JournalVoucher.create(withCompanyId(req, {
      jvNumber,
      date,
      narration,
      propertyId: propertyId || null,
      totalDebit,
      totalCredit,
      status: 'open', // New vouchers are open by default
      createdBy,
    }), { transaction: t });

    // Create Details (Ledger impact only on 'post')
    for (const detail of details) {
      await JournalVoucherDetail.create(withCompanyId(req, {
        ...detail,
        jvId: voucher.id,
        debitAmount: detail.type === 'Dr' ? detail.debitAmount : 0,
        creditAmount: detail.type === 'Cr' ? detail.creditAmount : 0
      }), { transaction: t });
    }

    await t.commit();

    res.status(201).json({
      success: true,
      message: 'Journal Voucher created successfully (Open)',
      data: voucher
    });
  } catch (error) {
    await t.rollback();
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Update journal voucher
const updateJournalVoucher = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { date, narration, details, propertyId } = req.body;
    const userId = req.user.id;

    const voucher = await JournalVoucher.findByPk(id, {
      include: [{ model: JournalVoucherDetail, as: 'details' }]
    });

    if (!voucher) {
      throw new Error('Journal Voucher not found');
    }

    if (voucher.status === 'cancelled') {
        throw new Error('Cannot update a cancelled voucher');
    }

    // 1. Reverse previous ledger impacts (Only if it was posted)
    if (voucher.status === 'posted') {
      for (const oldDetail of voucher.details) {
        const account = await ChartOfAccount.findByPk(oldDetail.ledgerId, { transaction: t });
        if (account) {
          const amount = parseFloat(oldDetail.debitAmount > 0 ? oldDetail.debitAmount : oldDetail.creditAmount);
          const type = oldDetail.debitAmount > 0 ? 'Dr' : 'Cr';
          const isNormalDebit = ['asset', 'expense'].includes(account.accountType);
          
          const reverseChange = type === 'Dr'
            ? (isNormalDebit ? -amount : amount)
            : (isNormalDebit ? amount : -amount);

          await account.update({
            balance: parseFloat(account.balance || 0) + reverseChange
          }, { transaction: t });
        }
      }
      // Delete old financial transactions
      await FinancialTransaction.destroy({ where: { reference: voucher.jvNumber }, transaction: t });
    }

    // 2. Delete old details
    await JournalVoucherDetail.destroy({ where: { jvId: id }, transaction: t });

    // 3. Validate new details balance
    let totalDebit = 0;
    let totalCredit = 0;
    details.forEach(detail => {
      if (detail.type === 'Dr') totalDebit += parseFloat(detail.debitAmount || 0);
      else totalCredit += parseFloat(detail.creditAmount || 0);
    });

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new Error(`Out of balance: Total Debit (${totalDebit.toFixed(2)}) must equal Total Credit (${totalCredit.toFixed(2)})`);
    }

    // 4. Update Header (Reset to open if it was posted?)
    await voucher.update({
      date,
      narration,
      propertyId: propertyId || null,
      totalDebit,
      totalCredit,
      status: 'open', // Revert to open after update
      updatedBy: userId
    }, { transaction: t });

    // 5. Create new details (Ledger impact only on 'post')
    for (const detail of details) {
      await JournalVoucherDetail.create({
        ...detail,
        jvId: voucher.id,
        debitAmount: detail.type === 'Dr' ? detail.debitAmount : 0,
        creditAmount: detail.type === 'Cr' ? detail.creditAmount : 0
      }, { transaction: t });
    }

    await t.commit();
    res.json({
      success: true,
      message: 'Journal Voucher updated successfully',
      data: voucher
    });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete (Cancel) journal voucher
const deleteJournalVoucher = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const voucher = await JournalVoucher.findByPk(id, {
      include: [{ model: JournalVoucherDetail, as: 'details' }]
    });

    if (!voucher) {
      throw new Error('Journal Voucher not found');
    }

    if (voucher.status === 'cancelled') {
        return res.json({ success: true, message: 'Voucher is already cancelled' });
    }

    // 1. Reverse ledger impacts (Only if it was posted)
    if (voucher.status === 'posted') {
      for (const oldDetail of voucher.details) {
        const account = await ChartOfAccount.findByPk(oldDetail.ledgerId, { transaction: t });
        if (account) {
          const amount = parseFloat(oldDetail.debitAmount > 0 ? oldDetail.debitAmount : oldDetail.creditAmount);
          const type = oldDetail.debitAmount > 0 ? 'Dr' : 'Cr';
          const isNormalDebit = ['asset', 'expense'].includes(account.accountType);
          
          const reverseChange = type === 'Dr'
            ? (isNormalDebit ? -amount : amount)
            : (isNormalDebit ? amount : -amount);

          await account.update({
            balance: parseFloat(account.balance || 0) + reverseChange
          }, { transaction: t });
        }
      }
      // Void financial transactions
      await FinancialTransaction.destroy({ where: { reference: voucher.jvNumber }, transaction: t });
    }

    // 2. Mark as cancelled
    await voucher.update({
      status: 'cancelled',
      updatedBy: userId
    }, { transaction: t });

    await t.commit();
    res.json({
      success: true,
      message: 'Journal Voucher cancelled successfully'
    });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ success: false, message: error.message });
  }
};

// Post journal voucher
const postJournalVoucher = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const voucher = await loadPostingSource(JournalVoucher, id, req, {
      transaction: t,
      include: [{ model: JournalVoucherDetail, as: 'details' }],
    });
    buildPostingContext({ req, sourceType: 'journal_voucher', sourceId: id, sourceRecord: voucher });

    if (voucher.status === 'posted') throw new Error('Journal Voucher is already posted');
    if (voucher.status === 'cancelled') throw new Error('Cannot post a cancelled voucher');
    await periodValidation.validatePostingDate(req, voucher.date);

    // 4.1 Validation Requirement: Total Debit Amount = Total Credit Amount
    if (Math.abs(parseFloat(voucher.totalDebit) - parseFloat(voucher.totalCredit)) > 0.001) {
      throw new Error(`Out of balance: Total Debit (${voucher.totalDebit}) must equal Total Credit (${voucher.totalCredit})`);
    }

    // Get the next transaction number
    const lastTrans = await AccountsTrans.findOne({
      order: [['transactionNo', 'DESC']],
      transaction: t
    });
    let nextTransNo = lastTrans ? lastTrans.transactionNo + 1 : 100000;
    const atLines = [];

    // Create Ledger Entries and Update Balances
    for (const detail of voucher.details) {
      await assertAccountInCompany(detail.ledgerId, req);
      if (detail.particularType === 'Supplier' && detail.billId) {
        await assertVendorInvoiceInCompany(detail.billId, req);
      }

      atLines.push({
        transactionNo: nextTransNo++,
        transactionDate: voucher.date,
        jvNumber: voucher.jvNumber,
        crDr: detail.debitAmount > 0 ? 'Dr' : 'Cr',
        particular: detail.particularType ? `${detail.particularType}: ${detail.particularId || ''}` : 'Journal Entry',
        ledgerId: detail.ledgerId,
        debitAmount: detail.debitAmount,
        creditAmount: detail.creditAmount,
        billId: detail.particularType === 'Supplier' ? detail.billId : null,
        invoiceId: detail.particularType === 'Customer' ? detail.billId : null,
        particularType: detail.particularType === 'Customer' ? 'Tenant' : (detail.particularType === 'Supplier' ? 'Vendor' : 'Other'),
        particularId: detail.particularId,
        narration: detail.narration || voucher.narration,
        jvId: voucher.id
      });

      // Update FinancialTransaction (legacy tracking)
      await createCompanyFinancialTransaction({
        companyId: req.companyId,
        payload: {
          transactionNumber: `FT-${voucher.jvNumber}-${detail.id}`,
          transactionDate: voucher.date,
          description: detail.narration || voucher.narration || 'Journal Voucher Entry',
          reference: voucher.jvNumber,
          amount: detail.debitAmount > 0 ? detail.debitAmount : detail.creditAmount,
          transactionType: detail.debitAmount > 0 ? 'debit' : 'credit',
          accountId: detail.ledgerId,
          category: 'other',
          status: 'approved',
          createdBy: userId,
          approvedBy: userId,
          approvedAt: new Date()
        },
        transaction: t,
        req,
        sourceType: 'journal_voucher',
        sourceId: voucher.id,
        auditAction: null,
      });

      // Update Account Balance
      const account = await ChartOfAccount.findOne({
        where: { id: detail.ledgerId, ...companyWhere(req) },
        transaction: t,
      });
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

      // Update Bill Payment Status if applicable
      if (detail.particularType === 'Supplier' && detail.billId) {
        const bill = await VendorInvoice.findOne({
          where: { id: detail.billId, ...companyWhere(req) },
          transaction: t,
        });
        if (bill && bill.paymentStatus !== 'paid') {
            await bill.update({
                paymentStatus: 'paid'
            }, { transaction: t });
        }
      }
    }

    await createCompanyAccountingEntry({
      companyId: req.companyId,
      lines: atLines,
      transaction: t,
      req,
      sourceType: 'journal_voucher',
      sourceId: voucher.id,
      auditAction: COMPANY_AUDIT_ACTIONS.JV_POSTED,
    });

    // Update Status to posted and lock the JV (Requirement 3.2)
    await voucher.update({
      status: 'posted',
      postedBy: userId,
      postedAt: new Date(),
      updatedBy: userId
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: 'Journal Voucher posted successfully and locked' });
  } catch (error) {
    await t.rollback();
    const status = error.statusCode || 400;
    res.status(status).json({ success: false, message: error.message });
  }
};

// UnPost journal voucher
const unpostJournalVoucher = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const voucher = await loadPostingSource(JournalVoucher, id, req, {
      transaction: t,
      include: [{ model: JournalVoucherDetail, as: 'details' }],
    });
    buildPostingContext({ req, sourceType: 'journal_voucher', sourceId: id, sourceRecord: voucher });

    if (voucher.status !== 'posted') throw new Error('Only posted vouchers can be unposted');

    // 1. Revert ledger impacts
    for (const detail of voucher.details) {
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

      // Revert Bill Payment Status if applicable
      if (detail.particularType === 'Supplier' && detail.billId) {
        const bill = await VendorInvoice.findOne({
          where: { id: detail.billId, ...companyWhere(req) },
          transaction: t,
        });
        if (bill && bill.paymentStatus === 'paid') {
          await bill.update({
            paymentStatus: 'unpaid'
          }, { transaction: t });
        }
      }
    }

    // 1. Remove entries from Accounts_Trans (UnPost Requirement 1)
    await AccountsTrans.destroy({
      where: { jvId: id, ...companyWhere(req) },
      transaction: t,
    });

    await FinancialTransaction.destroy({
      where: { reference: voucher.jvNumber, ...companyWhere(req) },
      transaction: t,
    });

    await logFinancePostingEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.FINANCE_POSTING_REVERSED,
      companyId: req.companyId,
      metadata: { source_type: 'journal_voucher', source_id: id },
    });

    // 2. Mark as open and unlock (UnPost Requirement 2)
    await voucher.update({
      status: 'open',
      postedBy: null,
      postedAt: null,
      updatedBy: userId
    }, { transaction: t });

    // 3. Proper audit tracking (UnPost Requirement 3)
    // We could implement a separate AuditLog model here if needed.
    // For now, the updatedAt field and record of changes in DB history serve as basic audit.

    await t.commit();
    res.json({ success: true, message: 'Journal Voucher unposted successfully and unlocked' });
  } catch (error) {
    await t.rollback();
    const status = error.statusCode || 400;
    res.status(status).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllJournalVouchers,
  getJournalVoucherById,
  createJournalVoucher,
  updateJournalVoucher,
  deleteJournalVoucher,
  postJournalVoucher,
  unpostJournalVoucher
};
