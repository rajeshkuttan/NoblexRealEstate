const { BankAccount, BankTransaction, Payment, CreditLimit, Investment, Cheque, SecurityDeposit, PettyCash, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.getCashPositionReport = async (req, res) => {
  try {
    const accounts = await BankAccount.findAll({
      where: { isActive: true },
      attributes: ['id', 'bankName', 'accountName', 'accountNumber', 'currency', 'currentBalance']
    });

    const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.currentBalance), 0);
    const balanceByCurrency = accounts.reduce((acc, bank) => {
      acc[bank.currency] = (acc[bank.currency] || 0) + parseFloat(bank.currentBalance);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: { accounts, totalBalance, balanceByCurrency, asOf: new Date() }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate cash position report', error: error.message });
  }
};

exports.getCollectionsReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const totalCollections = await Payment.sum('amount', {
      where: {
        status: 'paid',
        paymentDate: { [Op.between]: [startDate, endDate] }
      }
    }) || 0;

    const overduePayments = await Payment.sum('amount', {
      where: {
        status: 'overdue',
        dueDate: { [Op.lt]: new Date() }
      }
    }) || 0;

    const upcomingPayments = await Payment.sum('amount', {
      where: {
        status: 'pending',
        dueDate: { [Op.gte]: new Date() }
      }
    }) || 0;

    res.status(200).json({
      success: true,
      data: { totalCollections, overduePayments, upcomingPayments, period: { startDate, endDate } }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate collections report', error: error.message });
  }
};

exports.getTreasuryDashboard = async (req, res) => {
  try {
    const cashBalance = await BankAccount.sum('current_balance', { where: { isActive: true } }) || 0;
    const investmentValue = await Investment.sum('current_value', { where: { status: 'active', isActive: true } }) || 0;
    const securityDepositsHeld = await SecurityDeposit.sum('amount', { where: { status: 'held', isActive: true } }) || 0;
    const pettyCashBalance = await PettyCash.sum('amount', {
      where: { type: 'replenishment', status: 'approved', isActive: true }
    }) - await PettyCash.sum('amount', {
      where: { type: 'expense', status: 'approved', isActive: true }
    }) || 0;

    const overdueReceivables = await Payment.sum('amount', {
      where: { status: 'overdue', dueDate: { [Op.lt]: new Date() } }
    }) || 0;

    const creditExposure = await CreditLimit.sum('current_balance', { where: { isActive: true } }) || 0;

    res.status(200).json({
      success: true,
      data: {
        cashBalance,
        investmentValue,
        securityDepositsHeld,
        pettyCashBalance,
        overdueReceivables,
        creditExposure,
        totalLiquidity: cashBalance + investmentValue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate treasury dashboard', error: error.message });
  }
};
