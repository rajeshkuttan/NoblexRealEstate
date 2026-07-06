const {
  BankAccount,
  Payment,
  CreditLimit,
  Investment,
  SecurityDeposit,
  PettyCash,
  Tenant,
  Property,
} = require('../models');
const { Op } = require('sequelize');
const { whereCompany, logReportEvent } = require('../services/reportCompanyContext.service');
const { COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');

exports.getCashPositionReport = async (req, res) => {
  try {
    const accounts = await BankAccount.findAll({
      where: { isActive: true, ...whereCompany(req) },
      attributes: ['id', 'bankName', 'accountName', 'accountNumber', 'currency', 'currentBalance']
    });

    const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.currentBalance), 0);
    const balanceByCurrency = accounts.reduce((acc, bank) => {
      acc[bank.currency] = (acc[bank.currency] || 0) + parseFloat(bank.currentBalance);
      return acc;
    }, {});

    await logReportEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.REPORT_GENERATED,
      metadata: { report_type: 'treasury_cash_position' },
    });
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
        ...whereCompany(req),
        status: 'paid',
        paymentDate: { [Op.between]: [startDate, endDate] }
      }
    }) || 0;

    const overduePayments = await Payment.sum('amount', {
      where: {
        ...whereCompany(req),
        status: 'overdue',
        dueDate: { [Op.lt]: new Date() }
      }
    }) || 0;

    const upcomingPayments = await Payment.sum('amount', {
      where: {
        ...whereCompany(req),
        status: 'pending',
        dueDate: { [Op.gte]: new Date() }
      }
    }) || 0;

    await logReportEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.REPORT_GENERATED,
      metadata: { report_type: 'treasury_collections', startDate, endDate },
    });
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
    const cashBalance = await BankAccount.sum('currentBalance', {
      where: { isActive: true, ...whereCompany(req) },
    }) || 0;
    const investmentValue = await Investment.sum('currentValue', {
      where: { status: 'active', isActive: true },
      include: [{ model: BankAccount, as: 'bankAccount', required: true, where: whereCompany(req), attributes: [] }],
    }) || 0;
    const securityDepositsHeld = await SecurityDeposit.sum('amount', {
      where: { status: 'held', isActive: true, ...whereCompany(req) },
    }) || 0;
    const pettyCashReplenishment = await PettyCash.sum('amount', {
      where: { type: 'replenishment', status: 'approved', isActive: true },
      include: [{ model: Property, as: 'property', required: true, where: whereCompany(req), attributes: [] }],
    }) || 0;
    const pettyCashExpense = await PettyCash.sum('amount', {
      where: { type: 'expense', status: 'approved', isActive: true },
      include: [{ model: Property, as: 'property', required: true, where: whereCompany(req), attributes: [] }],
    }) || 0;
    const pettyCashBalance = pettyCashReplenishment - pettyCashExpense;

    // Use Invoice for Receivables
    const { Invoice } = require('../models');
    const totalRevenue = await Invoice.sum('totalAmount', {
      where: { isActive: true, ...whereCompany(req) },
    }) || 0;
    
    const pendingInvoices = await Invoice.findAll({ 
      where: { 
        status: { [Op.not]: 'paid' },
        isActive: true,
        ...whereCompany(req),
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
        isActive: true,
        ...whereCompany(req),
      }
    }) || 0;

    // Upcoming Revenue (Due in the next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const upcomingRevenue = await Invoice.sum('totalAmount', {
      where: {
        status: { [Op.not]: 'paid' },
        dueDate: { [Op.between]: [new Date(), thirtyDaysFromNow] },
        isActive: true,
        ...whereCompany(req),
      }
    }) || 0;

    const overdueReceivables = await Invoice.sum('totalAmount', {
      where: { 
        status: 'overdue',
        isActive: true,
        ...whereCompany(req),
      }
    }) || 0;

    const creditExposure = await CreditLimit.sum('currentBalance', {
      where: { isActive: true },
      include: [{ model: Tenant, as: 'tenant', required: true, where: whereCompany(req), attributes: [] }],
    }) || 0;

    await logReportEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.DASHBOARD_VIEWED,
      metadata: { report_type: 'treasury_dashboard' },
    });
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

exports.getInvestmentCashSummary = async (req, res) => {
  try {
    const treasurySummary = require('../services/investment/investmentTreasurySummary.service');
    const data = await treasurySummary.getInvestmentTreasurySummary(req, req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to load investment cash summary',
    });
  }
};
