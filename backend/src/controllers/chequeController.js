/**
 * Cheque Controller
 * Handles cheque and PDC management operations
 */

const {
  Cheque,
  Payment,
  Tenant,
  Lease,
  Unit,
  Property,
  BankAccount,
  User,
  AccountsTrans,
  ChartOfAccount,
  LedgerSetup,
  sequelize,
} = require('../models');
const { Op } = require('sequelize');
const { companyWhere, withCompanyId, assertBankInCompany, assertChequeInCompany, assertAccountInCompany, assertTenantInCompany } = require('../utils/companyScope');
const {
  buildPostingContext,
  loadPostingSource,
  logFinancePostingEvent,
} = require('../services/financePostingContext.service');
const {
  createCompanyAccountingEntry,
  COMPANY_AUDIT_ACTIONS,
} = require('../services/companyAccountingEntry.service');
const periodValidation = require('../services/periodValidationService');

function parseDate(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === 'number' && v > 10000 && v < 100000) {
    const epoch = new Date(Math.round((v - 25569) * 86400000));
    if (!isNaN(epoch.getTime())) return epoch;
  }
  const str = String(v).trim();
  const iso = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return new Date(iso[1]);
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

async function getNextTransactionNo(transaction) {
  const lastTrans = await AccountsTrans.findOne({
    order: [['transactionNo', 'DESC']],
    transaction,
  });
  let next = 100000;
  if (lastTrans && lastTrans.transactionNo >= 100000) {
    next = lastTrans.transactionNo + 1;
  }
  return next;
}

async function updateLedgerBalance(ledgerId, debitAmount, creditAmount, transaction) {
  const account = await ChartOfAccount.findByPk(ledgerId, { transaction });
  if (!account) return;
  const amount = parseFloat(debitAmount > 0 ? debitAmount : creditAmount);
  const type = debitAmount > 0 ? 'Dr' : 'Cr';
  const isNormalDebit = ['asset', 'expense'].includes(account.accountType);
  const change =
    type === 'Dr'
      ? isNormalDebit
        ? amount
        : -amount
      : isNormalDebit
        ? -amount
        : amount;
  await account.update(
    { balance: parseFloat(account.balance || 0) + change },
    { transaction },
  );
}

/**
 * Get all cheques
 */
exports.getAllCheques = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      chequeType,
      tenantId,
      leaseId,
      invoiceId,
      bankName,
      startDate,
      endDate,
      isOpeningBalance,
      undepositedOnly,
      sortBy = 'chequeDate',
      sortOrder = 'ASC'
    } = req.query;

    const whereClause = { isActive: true, ...companyWhere(req) };
    
    if (status) whereClause.status = status;
    if (chequeType) whereClause.chequeType = chequeType;
    if (isOpeningBalance === 'true') whereClause.isOpeningBalance = true;
    if (isOpeningBalance === 'false') whereClause.isOpeningBalance = false;
    if (undepositedOnly === 'true') {
      whereClause.status = { [Op.in]: ['pending', 'received'] };
    }
    if (tenantId) whereClause.tenantId = tenantId;
    if (leaseId) whereClause.leaseId = leaseId;
    
    // Handle invoiceId filtering (including null/empty check)
    if (invoiceId !== undefined) {
      if (invoiceId === 'null' || invoiceId === null) {
        whereClause.invoiceId = null;
      } else {
        whereClause.invoiceId = invoiceId;
      }
    }

    if (bankName) whereClause.bankName = { [Op.like]: `%${bankName}%` };
    
    if (startDate && endDate) {
      whereClause.chequeDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const { count: totalCount, rows: rawCheques } = await Cheque.findAndCountAll({
      where: whereClause,
      distinct: true,
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Lease,
          as: 'lease',
          attributes: ['id', 'leaseNumber'],
          include: ['unit']
        },
        {
          model: Payment,
          as: 'payment',
          attributes: ['id', 'paymentNumber', 'amount', 'status']
        },
        {
          model: BankAccount,
          as: 'bankAccount',
          attributes: ['id', 'bankName', 'accountName', 'accountNumber']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        },
        {
            model: require('../models').Invoice,
            as: 'invoice',
            attributes: ['id', 'invoiceNumber']
        }
      ],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [[sortBy, sortOrder]]
    });

    const cheques = rawCheques;
    const count = totalCount;

    res.status(200).json({
      success: true,
      data: {
        cheques,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get cheques error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cheques',
      error: error.message
    });
  }
};

/**
 * Get PDC register (undeposited and deposited PDCs; includes opening balance)
 */
exports.getPDCRegister = async (req, res) => {
  try {
    const { month, year, undepositedOnly } = req.query;

    const whereClause = {
      chequeType: 'pdc',
      isActive: true,
      ...companyWhere(req),
    };

    if (undepositedOnly === 'true') {
      whereClause.status = { [Op.in]: ['pending', 'received'] };
    } else {
      whereClause.status = { [Op.in]: ['pending', 'received', 'deposited'] };
    }

    if (month && year) {
      const startDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      const endDate = new Date(parseInt(year, 10), parseInt(month, 10), 0, 23, 59, 59);
      whereClause.chequeDate = { [Op.between]: [startDate, endDate] };
    }

    const pdcCheques = await Cheque.findAll({
      where: whereClause,
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'email', 'mobile']
        },
        {
          model: Lease,
          as: 'lease',
          attributes: ['id', 'leaseNumber'],
          include: ['unit', 'property']
        }
      ],
      order: [['chequeDate', 'ASC']]
    });

    // Group by month
    const groupedByMonth = pdcCheques.reduce((acc, cheque) => {
      const monthKey = new Date(cheque.chequeDate).toISOString().slice(0, 7);
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          cheques: [],
          totalAmount: 0,
          count: 0
        };
      }
      acc[monthKey].cheques.push(cheque);
      acc[monthKey].totalAmount += parseFloat(cheque.amount);
      acc[monthKey].count += 1;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        pdcRegister: Object.values(groupedByMonth),
        totalCheques: pdcCheques.length,
        totalAmount: pdcCheques.reduce((sum, c) => sum + parseFloat(c.amount), 0)
      }
    });
  } catch (error) {
    console.error('Get PDC register error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch PDC register',
      error: error.message
    });
  }
};

/**
 * Get cheque by ID
 */
exports.getChequeById = async (req, res) => {
  try {
    const { id } = req.params;

    const cheque = await Cheque.findOne({
      where: { id, ...companyWhere(req) },
      include: [
        {
          model: Tenant,
          as: 'tenant'
        },
        {
          model: Lease,
          as: 'lease',
          include: ['unit', 'property']
        },
        {
          model: Payment,
          as: 'payment'
        },
        {
          model: BankAccount,
          as: 'bankAccount'
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'depositor',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Cheque,
          as: 'replacementCheque',
          attributes: ['id', 'chequeNumber', 'amount', 'status']
        },
        {
          model: Cheque,
          as: 'originalCheque',
          attributes: ['id', 'chequeNumber', 'amount', 'status']
        }
      ]
    });

    if (!cheque) {
      return res.status(404).json({
        success: false,
        message: 'Cheque not found'
      });
    }

    res.status(200).json({
      success: true,
      data: cheque
    });
  } catch (error) {
    console.error('Get cheque error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cheque',
      error: error.message
    });
  }
};

/**
 * Create cheque
 */
exports.createCheque = async (req, res) => {
  try {
    const {
      chequeNumber,
      tenantId,
      leaseId,
      paymentId,
      bankAccountId,
      bankName,
      branchName,
      amount,
      currency = 'AED',
      chequeDate,
      chequeType = 'current',
      scannedImage,
      notes
    } = req.body;

    // Check for duplicate cheque number
    const existingCheque = await Cheque.findOne({
      where: {
        chequeNumber,
        bankName,
        tenantId,
        isActive: true,
        status: { [Op.notIn]: ['bounced', 'cancelled'] }
      }
    });

    if (existingCheque) {
      return res.status(400).json({
        success: false,
        message: 'A cheque with this number already exists for this tenant'
      });
    }

    const cheque = await Cheque.create(withCompanyId(req, {
      chequeNumber,
      tenantId,
      leaseId,
      paymentId,
      bankAccountId,
      bankName,
      branchName,
      amount,
      currency,
      chequeDate,
      chequeType,
      scannedImage,
      notes,
      createdBy: req.user.id
    }));

    res.status(201).json({
      success: true,
      message: 'Cheque created successfully',
      data: cheque
    });
  } catch (error) {
    console.error('Create cheque error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create cheque',
      error: error.message
    });
  }
};

/**
 * Update cheque
 */
exports.updateCheque = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const cheque = await Cheque.findByPk(id);
    if (!cheque) {
      return res.status(404).json({
        success: false,
        message: 'Cheque not found'
      });
    }

    // Don't allow updating cleared or bounced cheques
    if (['cleared', 'bounced'].includes(cheque.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update a ${cheque.status} cheque`
      });
    }

    await cheque.update(updates);

    res.status(200).json({
      success: true,
      message: 'Cheque updated successfully',
      data: cheque
    });
  } catch (error) {
    console.error('Update cheque error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update cheque',
      error: error.message
    });
  }
};

/**
 * Deposit cheque — posts Dr Bank / Cr PDC GL
 */
exports.depositCheque = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { bankAccountId, bankReference, depositDate } = req.body;

    const cheque = await loadPostingSource(Cheque, id, req, { transaction: t });
    buildPostingContext({ req, sourceType: 'cheque', sourceId: id, sourceRecord: cheque });
    await periodValidation.validatePostingDate(req, depositDate || cheque.chequeDate);

    if (!['pending', 'received'].includes(cheque.status)) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only pending or received cheques can be deposited',
      });
    }

    if (cheque.glDepositPosted) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Deposit GL has already been posted for this cheque',
      });
    }

    if (!bankAccountId) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Bank account is required',
      });
    }

    await assertBankInCompany(bankAccountId, req);
    await assertChequeInCompany(id, req);

    const bankAccount = await BankAccount.findOne({
      where: { id: bankAccountId, ...companyWhere(req) },
      transaction: t,
    });
    if (!bankAccount || !bankAccount.chartAccountId) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'Bank account not found or not linked to a chart of accounts ledger',
      });
    }

    const pdcSetup = await LedgerSetup.findOne({
      where: {
        documentType: 'Receipt',
        amountType: 'Cr',
        subDocument: 'PDC',
        ...companyWhere(req),
      },
      order: [['subDocument', 'DESC']],
      transaction: t,
    });

    if (!pdcSetup) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message:
          'Ledger Setup missing: configure Receipt / PDC / Cr to your PDC GL account before depositing',
      });
    }

    await assertAccountInCompany(bankAccount.chartAccountId, req);
    await assertAccountInCompany(pdcSetup.postingType, req);

    const amount = parseFloat(cheque.amount);
    const depDate = depositDate ? new Date(depositDate) : new Date();
    const jvNumber = `PDC-DEP-${cheque.chequeNumber}`;
    let transactionNo = await getNextTransactionNo(t);

    await createCompanyAccountingEntry({
      companyId: req.companyId,
      lines: [
        {
          transactionNo: transactionNo++,
          transactionDate: depDate,
          jvNumber,
          crDr: 'Dr',
          particular: `PDC Deposit - Bank (${cheque.chequeNumber})`,
          ledgerId: bankAccount.chartAccountId,
          debitAmount: amount,
          creditAmount: 0,
          particularType: 'Tenant',
          particularId: cheque.tenantId,
          narration: bankReference || `PDC deposit ${cheque.chequeNumber}`,
          chequeId: cheque.id,
        },
        {
          transactionNo: transactionNo++,
          transactionDate: depDate,
          jvNumber,
          crDr: 'Cr',
          particular: `PDC Deposit - PDC (${cheque.chequeNumber})`,
          ledgerId: pdcSetup.postingType,
          debitAmount: 0,
          creditAmount: amount,
          particularType: 'Tenant',
          particularId: cheque.tenantId,
          narration: bankReference || `PDC deposit ${cheque.chequeNumber}`,
          chequeId: cheque.id,
        },
      ],
      transaction: t,
      req,
      sourceType: 'cheque',
      sourceId: cheque.id,
      auditAction: COMPANY_AUDIT_ACTIONS.PDC_DEPOSIT_POSTED,
    });

    await updateLedgerBalance(bankAccount.chartAccountId, amount, 0, t);
    await updateLedgerBalance(pdcSetup.postingType, 0, amount, t);

    await bankAccount.update(
      { currentBalance: parseFloat(bankAccount.currentBalance || 0) + amount },
      { transaction: t },
    );

    await cheque.update(
      {
        status: 'deposited',
        depositDate: depDate,
        bankAccountId,
        bankReference,
        depositedBy: req.user.id,
        glDepositPosted: true,
      },
      { transaction: t },
    );

    await t.commit();

    res.status(200).json({
      success: true,
      message: 'Cheque deposited and GL posted (Dr Bank, Cr PDC)',
      data: cheque,
    });
  } catch (error) {
    try {
      await t.rollback();
    } catch (_) {}
    console.error('Deposit cheque error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to deposit cheque',
      error: error.message,
    });
  }
};

/**
 * Clear cheque
 */
exports.clearCheque = async (req, res) => {
  try {
    const { id } = req.params;
    const { clearanceDate } = req.body;

    const cheque = await Cheque.findByPk(id, {
      include: [{ model: Payment, as: 'payment' }]
    });

    if (!cheque) {
      return res.status(404).json({
        success: false,
        message: 'Cheque not found'
      });
    }

    if (cheque.status !== 'deposited') {
      return res.status(400).json({
        success: false,
        message: 'Only deposited cheques can be cleared'
      });
    }

    await cheque.update({
      status: 'cleared',
      clearanceDate: clearanceDate || new Date()
    });

    // Update linked payment status
    if (cheque.payment && cheque.payment.status === 'pending') {
      await cheque.payment.update({ status: 'paid' });
    }

    res.status(200).json({
      success: true,
      message: 'Cheque cleared successfully',
      data: cheque
    });
  } catch (error) {
    console.error('Clear cheque error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cheque',
      error: error.message
    });
  }
};

/**
 * Bounce cheque
 */
exports.bounceCheque = async (req, res) => {
  try {
    const { id } = req.params;
    const { bounceReason, bounceFee = 0, bounceDate } = req.body;

    const cheque = await Cheque.findByPk(id, {
      include: [{ model: Payment, as: 'payment' }]
    });

    if (!cheque) {
      return res.status(404).json({
        success: false,
        message: 'Cheque not found'
      });
    }

    if (cheque.status !== 'deposited') {
      return res.status(400).json({
        success: false,
        message: 'Only deposited cheques can bounce'
      });
    }

    await cheque.update({
      status: 'bounced',
      bounceReason,
      bounceFee,
      bouncedDate: bounceDate || new Date()
    });

    // Update linked payment status
    if (cheque.payment) {
      await cheque.payment.update({ 
        status: 'overdue',
        notes: `${cheque.payment.notes || ''}\nCheque bounced: ${bounceReason}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cheque marked as bounced',
      data: cheque
    });
  } catch (error) {
    console.error('Bounce cheque error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark cheque as bounced',
      error: error.message
    });
  }
};

/**
 * Cancel cheque
 */
exports.cancelCheque = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const cheque = await Cheque.findByPk(id);
    if (!cheque) {
      return res.status(404).json({
        success: false,
        message: 'Cheque not found'
      });
    }

    if (['cleared', 'bounced'].includes(cheque.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a ${cheque.status} cheque`
      });
    }

    await cheque.update({
      status: 'cancelled',
      notes: `${cheque.notes || ''}\nCancelled: ${reason || 'No reason provided'}`
    });

    res.status(200).json({
      success: true,
      message: 'Cheque cancelled successfully',
      data: cheque
    });
  } catch (error) {
    console.error('Cancel cheque error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel cheque',
      error: error.message
    });
  }
};

/**
 * Replace bounced cheque
 */
exports.replaceCheque = async (req, res) => {
  try {
    const { id } = req.params;
    const { newChequeNumber, newBankName, newChequeDate, newAmount } = req.body;

    const originalCheque = await Cheque.findByPk(id);
    if (!originalCheque) {
      return res.status(404).json({
        success: false,
        message: 'Original cheque not found'
      });
    }

    if (originalCheque.status !== 'bounced') {
      return res.status(400).json({
        success: false,
        message: 'Only bounced cheques can be replaced'
      });
    }

    // Create replacement cheque
    const replacementCheque = await Cheque.create({
      chequeNumber: newChequeNumber,
      tenantId: originalCheque.tenantId,
      leaseId: originalCheque.leaseId,
      paymentId: originalCheque.paymentId,
      bankAccountId: originalCheque.bankAccountId,
      bankName: newBankName || originalCheque.bankName,
      branchName: originalCheque.branchName,
      amount: newAmount || originalCheque.amount,
      currency: originalCheque.currency,
      chequeDate: newChequeDate || originalCheque.chequeDate,
      chequeType: originalCheque.chequeType,
      originalChequeId: originalCheque.id,
      notes: `Replacement for bounced cheque ${originalCheque.chequeNumber}`,
      createdBy: req.user.id
    });

    // Update original cheque
    await originalCheque.update({
      status: 'replaced',
      replacementChequeId: replacementCheque.id
    });

    res.status(201).json({
      success: true,
      message: 'Replacement cheque created successfully',
      data: {
        originalCheque,
        replacementCheque
      }
    });
  } catch (error) {
    console.error('Replace cheque error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create replacement cheque',
      error: error.message
    });
  }
};

/**
 * Get cheque statistics
 */
exports.getChequeStats = async (req, res) => {
  try {
    const scope = { isActive: true, ...companyWhere(req) };
    const totalCheques = await Cheque.count({ where: scope });
    const pendingCheques = await Cheque.count({ where: { status: 'pending', ...scope } });
    const depositedCheques = await Cheque.count({ where: { status: 'deposited', ...scope } });
    const clearedCheques = await Cheque.count({ where: { status: 'cleared', ...scope } });
    const bouncedCheques = await Cheque.count({ where: { status: 'bounced', ...scope } });

    const totalAmount = await Cheque.sum('amount', { where: scope });
    const pendingAmount = await Cheque.sum('amount', { where: { status: 'pending', ...scope } });
    const clearedAmount = await Cheque.sum('amount', { where: { status: 'cleared', ...scope } });
    const bouncedAmount = await Cheque.sum('amount', { where: { status: 'bounced', ...scope } });

    const receivedCheques = await Cheque.count({
      where: { status: 'received', ...scope },
    });
    const receivedAmount = await Cheque.sum('amount', {
      where: { status: 'received', ...scope },
    });

    const undepositedWhere = {
      chequeType: 'pdc',
      status: { [Op.in]: ['pending', 'received'] },
      ...scope,
    };
    const pdcCount = await Cheque.count({ where: undepositedWhere });
    const pdcAmount = await Cheque.sum('amount', { where: undepositedWhere });

    const openingWhere = {
      isOpeningBalance: true,
      status: { [Op.in]: ['pending', 'received'] },
      ...scope,
    };
    const openingBalanceCount = await Cheque.count({ where: openingWhere });
    const openingBalanceAmount = await Cheque.sum('amount', { where: openingWhere });

    // Bounce rate
    const bounceRate = totalCheques > 0 ? ((bouncedCheques / totalCheques) * 100).toFixed(2) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalCheques,
        pendingCheques,
        depositedCheques,
        clearedCheques,
        bouncedCheques,
        totalAmount: totalAmount || 0,
        pendingAmount: pendingAmount || 0,
        clearedAmount: clearedAmount || 0,
        bouncedAmount: bouncedAmount || 0,
        pdcCount,
        pdcAmount: pdcAmount || 0,
        receivedCheques,
        receivedAmount: receivedAmount || 0,
        openingBalanceCount,
        openingBalanceAmount: openingBalanceAmount || 0,
        bounceRate: parseFloat(bounceRate),
      },
    });
  } catch (error) {
    console.error('Get cheque stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

/**
 * Bulk import opening PDC balance (register only — no GL)
 */
exports.importOpeningBalance = async (req, res) => {
  try {
    const rows = req.body.cheques;
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(400).json({ success: false, message: 'No cheque data provided' });
    }

    const results = { success: 0, failed: 0, errors: [] };

    for (const [index, row] of rows.entries()) {
      const errs = [];
      const tenantId = row.tenantId ? parseInt(row.tenantId, 10) : null;
      const leaseId = row.leaseId ? parseInt(row.leaseId, 10) : null;
      const chequeNumber = String(row.chequeNumber || '').trim();
      const bankName = String(row.bankName || 'Unknown').trim();
      const amount = parseFloat(row.amount);
      const chequeDate = row.chequeDate ? parseDate(row.chequeDate) : null;

      if (!tenantId) errs.push('Tenant is required');
      if (!chequeNumber) errs.push('Cheque number is required');
      if (!bankName) errs.push('Bank name is required');
      if (!amount || amount <= 0) errs.push('Amount must be > 0');
      if (!chequeDate) errs.push('Cheque date is required');

      if (errs.length) {
        results.failed++;
        results.errors.push({ index, messages: errs });
        continue;
      }

      const existing = await Cheque.findOne({
        where: {
          chequeNumber,
          bankName,
          tenantId,
          isActive: true,
          status: { [Op.notIn]: ['bounced', 'cancelled'] },
        },
      });
      if (existing) {
        results.failed++;
        results.errors.push({
          index,
          messages: [`Cheque ${chequeNumber} already exists for this tenant and bank`],
        });
        continue;
      }

      try {
        await assertTenantInCompany(tenantId, req);
        if (leaseId) {
          const { assertLeaseInCompany } = require('../utils/companyScope');
          await assertLeaseInCompany(leaseId, req);
        }
        await Cheque.create(
          withCompanyId(req, {
            chequeNumber,
            tenantId,
            leaseId: leaseId || null,
            bankName,
            branchName: row.branchName || null,
            amount,
            currency: row.currency || 'AED',
            chequeDate,
            chequeType: 'pdc',
            status: 'received',
            isOpeningBalance: true,
            glDepositPosted: false,
            notes: row.notes || 'Opening balance PDC import',
            createdBy: req.user.id,
          })
        );
        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push({ index, messages: [e.message || String(e)] });
      }
    }

    res.json({
      success: true,
      message: `Import completed. Success: ${results.success}, Failed: ${results.failed}`,
      data: results,
    });
  } catch (error) {
    console.error('Import opening PDC error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import opening PDC cheques',
      error: error.message,
    });
  }
};

/**
 * PDC outstanding report (grouped by month)
 */
exports.getPDCOutstanding = async (req, res) => {
  try {
    const { undepositedOnly = 'true' } = req.query;
    const whereClause = {
      chequeType: 'pdc',
      isActive: true,
      ...companyWhere(req),
    };
    if (undepositedOnly === 'true') {
      whereClause.status = { [Op.in]: ['pending', 'received'] };
    }

    const cheques = await Cheque.findAll({
      where: whereClause,
      include: [
        { model: Tenant, as: 'tenant', attributes: ['id', 'name', 'email'] },
        { model: Lease, as: 'lease', attributes: ['id', 'leaseNumber'] },
      ],
      order: [['chequeDate', 'ASC']],
    });

    const byMonth = cheques.reduce((acc, c) => {
      const key = new Date(c.chequeDate).toISOString().slice(0, 7);
      if (!acc[key]) {
        acc[key] = {
          month: key,
          count: 0,
          totalAmount: 0,
          openingCount: 0,
          openingAmount: 0,
          cheques: [],
        };
      }
      acc[key].cheques.push(c);
      acc[key].count += 1;
      acc[key].totalAmount += parseFloat(c.amount);
      if (c.isOpeningBalance) {
        acc[key].openingCount += 1;
        acc[key].openingAmount += parseFloat(c.amount);
      }
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        months: Object.values(byMonth),
        totalCheques: cheques.length,
        totalAmount: cheques.reduce((s, c) => s + parseFloat(c.amount), 0),
        openingBalanceCount: cheques.filter((c) => c.isOpeningBalance).length,
        openingBalanceAmount: cheques
          .filter((c) => c.isOpeningBalance)
          .reduce((s, c) => s + parseFloat(c.amount), 0),
      },
    });
  } catch (error) {
    console.error('PDC outstanding report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDC outstanding report',
      error: error.message,
    });
  }
};

/**
 * Delete cheque (soft delete)
 */
exports.deleteCheque = async (req, res) => {
  try {
    const { id } = req.params;

    const cheque = await Cheque.findByPk(id);
    if (!cheque) {
      return res.status(404).json({
        success: false,
        message: 'Cheque not found'
      });
    }

    const deletableStatuses = cheque.isOpeningBalance
      ? ['pending', 'received', 'cancelled']
      : ['pending', 'cancelled'];
    if (!deletableStatuses.includes(cheque.status)) {
      return res.status(400).json({
        success: false,
        message: 'Can only delete pending or cancelled cheques'
      });
    }

    await cheque.update({ isActive: false });

    res.status(200).json({
      success: true,
      message: 'Cheque deleted successfully'
    });
  } catch (error) {
    console.error('Delete cheque error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete cheque',
      error: error.message
    });
  }
};
