/**
 * Petty Cash Controller
 */

const { PettyCash, Property, User, ChartOfAccount } = require('../models');
const { Op } = require('sequelize');

exports.getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, custodian, propertyId } = req.query;
    const whereClause = { isActive: true };
    
    if (status) whereClause.status = status;
    if (type) whereClause.type = type;
    if (custodian) whereClause.custodian = custodian;
    if (propertyId) whereClause.propertyId = propertyId;

    const { count, rows: transactions } = await PettyCash.findAndCountAll({
      where: whereClause,
      include: [
        { model: Property, as: 'property', attributes: ['id', 'title'] },
        { model: User, as: 'custodianUser', attributes: ['id', 'name'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] }
      ],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['transactionDate', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: { transactions, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) } }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch transactions', error: error.message });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const { type, category, amount, currency = 'AED', propertyId, custodian, transactionDate, description, vendor, receiptNumber, receiptImage, paymentMethod = 'cash', chartAccountId, notes } = req.body;
    
    const transactionNumber = `PC-${Date.now()}`;
    const currentBalance = await PettyCash.sum('amount', { where: { type: 'replenishment', isActive: true } }) - await PettyCash.sum('amount', { where: { type: 'expense', isActive: true } });
    
    const transaction = await PettyCash.create({
      transactionNumber, type, category, amount, currency, propertyId, custodian, transactionDate, description, vendor, receiptNumber, receiptImage, paymentMethod, chartAccountId, notes,
      balanceBefore: currentBalance || 0,
      balanceAfter: type === 'replenishment' ? (currentBalance || 0) + parseFloat(amount) : (currentBalance || 0) - parseFloat(amount),
      createdBy: req.user.id
    });

    res.status(201).json({ success: true, message: 'Transaction created successfully', data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create transaction', error: error.message });
  }
};

exports.approveTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await PettyCash.findByPk(id);
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
    if (transaction.status !== 'pending') return res.status(400).json({ success: false, message: 'Only pending transactions can be approved' });

    await transaction.update({ status: 'approved', approvedBy: req.user.id });
    res.status(200).json({ success: true, message: 'Transaction approved', data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve transaction', error: error.message });
  }
};

exports.rejectTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const transaction = await PettyCash.findByPk(id);
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });

    await transaction.update({ status: 'rejected', rejectionReason: reason });
    res.status(200).json({ success: true, message: 'Transaction rejected', data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reject transaction', error: error.message });
  }
};

exports.getBalance = async (req, res) => {
  try {
    const replenishments = await PettyCash.sum('amount', { where: { type: 'replenishment', status: 'approved', isActive: true } }) || 0;
    const expenses = await PettyCash.sum('amount', { where: { type: 'expense', status: 'approved', isActive: true } }) || 0;
    const balance = replenishments - expenses;

    res.status(200).json({ success: true, data: { replenishments, expenses, balance } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get balance', error: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const totalReplenishments = await PettyCash.sum('amount', { where: { type: 'replenishment', isActive: true } }) || 0;
    const totalExpenses = await PettyCash.sum('amount', { where: { type: 'expense', status: 'approved', isActive: true } }) || 0;
    const pendingApprovals = await PettyCash.count({ where: { status: 'pending', isActive: true } });
    const currentBalance = totalReplenishments - totalExpenses;

    res.status(200).json({ success: true, data: { totalReplenishments, totalExpenses, currentBalance, pendingApprovals } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats', error: error.message });
  }
};
