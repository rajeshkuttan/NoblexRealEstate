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
    const cashBalance = await BankAccount.sum('currentBalance', { where: { isActive: true } }) || 0;
    const investmentValue = await Investment.sum('currentValue', { where: { status: 'active', isActive: true } }) || 0;
    const securityDepositsHeld = await SecurityDeposit.sum('amount', { where: { status: 'held', isActive: true } }) || 0;
    const pettyCashBalance = await PettyCash.sum('amount', {
      where: { type: 'replenishment', status: 'approved', isActive: true }
    }) - await PettyCash.sum('amount', {
      where: { type: 'expense', status: 'approved', isActive: true }
    }) || 0;

    // Use Invoice for Receivables
    const { Invoice } = require('../models');
    const totalRevenue = await Invoice.sum('totalAmount', { where: { isActive: true } }) || 0;
    
    const pendingInvoices = await Invoice.findAll({ 
      where: { 
        status: { [Op.not]: 'paid' },
        isActive: true
      }
    });
    
    const pendingInvoicesCount = pendingInvoices.length;
    const pendingInvoicesAmount = pendingInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || 0), 0);

    // Month-To-Date Collections (Payments with status 'paid')
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const mtdCollections = await Payment.sum('amount', {
      where: {
        status: 'paid',
        payeeType: { [Op.not]: 'supplier' }, // Exclude payables
        paymentDate: { [Op.gte]: startOfMonth },
        isActive: true
      }
    }) || 0;

    // Upcoming Revenue (Due in the next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const upcomingRevenue = await Invoice.sum('totalAmount', {
      where: {
        status: { [Op.not]: 'paid' },
        dueDate: { [Op.between]: [new Date(), thirtyDaysFromNow] },
        isActive: true
      }
    }) || 0;

    const overdueReceivables = await Invoice.sum('totalAmount', {
      where: { 
        status: 'overdue',
        isActive: true
      }
    }) || 0;

    const creditExposure = await CreditLimit.sum('currentBalance', { where: { isActive: true } }) || 0;

    res.status(200).json({
      success: true,
      data: {
        cashBalance,
        investmentValue,
        securityDepositsHeld,
        pettyCashBalance,
        overdueReceivables,
        creditExposure,
        totalRevenue,
        pendingInvoicesCount,
        pendingInvoicesAmount,
        currentMonthRevenue: mtdCollections,
        nextMonthRevenue: upcomingRevenue,
        totalLiquidity: cashBalance + investmentValue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate treasury dashboard', error: error.message });
  }
};
