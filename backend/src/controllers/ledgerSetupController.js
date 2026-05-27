const { LedgerSetup, ChartOfAccount } = require('../models');
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');
const { companyWhere, withCompanyId, assertRecordInCompany, assertAccountInCompany } = require('../utils/companyScope');

async function assertLedgerAccountsInCompany(req, { ledgerId, chartAccountId, postingType } = {}) {
  const accountIds = [ledgerId, chartAccountId, postingType].filter((id) => id != null);
  for (const accountId of accountIds) {
    await assertAccountInCompany(accountId, req);
  }
}

// Get all ledger setups
const getAllLedgerSetups = async (req, res, next) => {
  try {
    const { search = '' } = req.query;
    const { page, limit, offset } = normalizePagination(req.query, 10, 200);

    const whereClause = { ...companyWhere(req) };
    if (search.trim()) {
      whereClause[Op.or] = [
        { documentType: { [Op.like]: `%${search.trim()}%` } },
        { subDocument: { [Op.like]: `%${search.trim()}%` } },
        { calculationOn: { [Op.like]: `%${search.trim()}%` } },
        { amountType: { [Op.like]: `%${search.trim()}%` } },
        { postingType: { [Op.like]: `%${search.trim()}%` } },
        { '$ledger.accountCode$': { [Op.like]: `%${search.trim()}%` } },
        { '$ledger.accountName$': { [Op.like]: `%${search.trim()}%` } }
      ];
    }

    const { count, rows } = await LedgerSetup.findAndCountAll({
      where: whereClause,
      distinct: true,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['id', 'DESC']],
      include: [
        {
          model: ChartOfAccount,
          as: 'ledger',
          attributes: ['id', 'accountCode', 'accountName']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        ledgerSetups: rows,
        pagination: createPaginationMeta(count, page, limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get ledger setup by ID
const getLedgerSetupById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ledgerSetup = await assertRecordInCompany(LedgerSetup, id, req, {
      include: [
        {
          model: ChartOfAccount,
          as: 'ledger',
          attributes: ['id', 'accountCode', 'accountName']
        }
      ]
    });

    res.json({ success: true, data: ledgerSetup });
  } catch (error) {
    next(error);
  }
};

// Create ledger setup
const createLedgerSetup = async (req, res, next) => {
  try {
    const { documentType, subDocument, calculationOn, amountType, postingType, ledgerId, chartAccountId } = req.body;
    
    // basic validation
    if (!documentType || !calculationOn || !amountType || !postingType) {
        return res.status(400).json({ success: false, message: 'All required fields must be provided' });
    }

    await assertLedgerAccountsInCompany(req, { ledgerId, chartAccountId, postingType });

    const ledgerSetup = await LedgerSetup.create(withCompanyId(req, {
      documentType,
      subDocument: (documentType === 'Payment Voucher' || documentType === 'Receipt') ? subDocument : null,
      calculationOn,
      amountType,
      postingType,
    }));

    res.status(201).json({ success: true, message: 'Ledger Setup created successfully', data: ledgerSetup });
  } catch (error) {
    next(error);
  }
};

// Update ledger setup
const updateLedgerSetup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { documentType, subDocument, calculationOn, amountType, postingType, ledgerId, chartAccountId } = req.body;

    const ledgerSetup = await assertRecordInCompany(LedgerSetup, id, req);

    await assertLedgerAccountsInCompany(req, { ledgerId, chartAccountId, postingType });

    await ledgerSetup.update(withCompanyId(req, {
      documentType,
      subDocument: (documentType === 'Payment Voucher' || documentType === 'Receipt') ? subDocument : null,
      calculationOn,
      amountType,
      postingType,
    }));

    res.json({ success: true, message: 'Ledger Setup updated successfully', data: ledgerSetup });
  } catch (error) {
    next(error);
  }
};

// Delete ledger setup
const deleteLedgerSetup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ledgerSetup = await assertRecordInCompany(LedgerSetup, id, req);

    await ledgerSetup.destroy();

    res.json({ success: true, message: 'Ledger Setup deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllLedgerSetups,
  getLedgerSetupById,
  createLedgerSetup,
  updateLedgerSetup,
  deleteLedgerSetup
};
