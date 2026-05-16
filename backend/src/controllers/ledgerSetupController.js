const { LedgerSetup, ChartOfAccount } = require('../models');
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');

// Get all ledger setups
const getAllLedgerSetups = async (req, res, next) => {
  try {
    const { search = '' } = req.query;
    const { page, limit, offset } = normalizePagination(req.query, 10, 200);

    const whereClause = {};
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
    const ledgerSetup = await LedgerSetup.findByPk(id, {
      include: [
        {
          model: ChartOfAccount,
          as: 'ledger',
          attributes: ['id', 'accountCode', 'accountName']
        }
      ]
    });

    if (!ledgerSetup) {
      return res.status(404).json({ success: false, message: 'Ledger Setup not found' });
    }

    res.json({ success: true, data: ledgerSetup });
  } catch (error) {
    next(error);
  }
};

// Create ledger setup
const createLedgerSetup = async (req, res, next) => {
  try {
    const { documentType, subDocument, calculationOn, amountType, postingType } = req.body;
    
    // basic validation
    if (!documentType || !calculationOn || !amountType || !postingType) {
        return res.status(400).json({ success: false, message: 'All required fields must be provided' });
    }

    const ledgerSetup = await LedgerSetup.create({
      documentType,
      subDocument: (documentType === 'Payment Voucher' || documentType === 'Receipt') ? subDocument : null,
      calculationOn,
      amountType,
      postingType,
    });

    res.status(201).json({ success: true, message: 'Ledger Setup created successfully', data: ledgerSetup });
  } catch (error) {
    next(error);
  }
};

// Update ledger setup
const updateLedgerSetup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { documentType, subDocument, calculationOn, amountType, postingType } = req.body;

    const ledgerSetup = await LedgerSetup.findByPk(id);

    if (!ledgerSetup) {
      return res.status(404).json({ success: false, message: 'Ledger Setup not found' });
    }

    await ledgerSetup.update({
      documentType,
      subDocument: (documentType === 'Payment Voucher' || documentType === 'Receipt') ? subDocument : null,
      calculationOn,
      amountType,
      postingType,
    });

    res.json({ success: true, message: 'Ledger Setup updated successfully', data: ledgerSetup });
  } catch (error) {
    next(error);
  }
};

// Delete ledger setup
const deleteLedgerSetup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ledgerSetup = await LedgerSetup.findByPk(id);

    if (!ledgerSetup) {
      return res.status(404).json({ success: false, message: 'Ledger Setup not found' });
    }

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
