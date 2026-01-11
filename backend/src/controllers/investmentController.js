const { Investment, BankAccount } = require('../models');

exports.getAllInvestments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const whereClause = { isActive: true };
    if (status) whereClause.status = status;

    const { count, rows: investments } = await Investment.findAndCountAll({
      where: whereClause,
      include: [{ model: BankAccount, as: 'bankAccount', attributes: ['id', 'bankName', 'accountName'] }],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['maturityDate', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: { investments, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) } }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch investments', error: error.message });
  }
};

exports.createInvestment = async (req, res) => {
  try {
    const { bankAccountId, investmentType, principalAmount, currency = 'AED', interestRate, term, startDate } = req.body;
    
    const maturityDate = new Date(startDate);
    maturityDate.setMonth(maturityDate.getMonth() + term);
    
    const investmentNumber = `INV-${Date.now()}`;

    const investment = await Investment.create({
      investmentNumber,
      bankAccountId,
      investmentType,
      principalAmount,
      currency,
      interestRate,
      term,
      startDate,
      maturityDate,
      currentValue: principalAmount
    });

    res.status(201).json({ success: true, message: 'Investment created', data: investment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create investment', error: error.message });
  }
};

exports.calculateInterest = async (req, res) => {
  try {
    const { id } = req.params;
    const investment = await Investment.findByPk(id);
    if (!investment) return res.status(404).json({ success: false, message: 'Investment not found' });

    const daysSinceStart = Math.floor((new Date() - new Date(investment.startDate)) / (1000 * 60 * 60 * 24));
    const accruedInterest = (investment.principalAmount * (investment.interestRate / 100) * daysSinceStart) / 365;
    const currentValue = parseFloat(investment.principalAmount) + accruedInterest;

    await investment.update({ accruedInterest, currentValue });

    res.status(200).json({ success: true, data: { accruedInterest, currentValue } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to calculate interest', error: error.message });
  }
};

exports.getInvestmentStats = async (req, res) => {
  try {
    const sequelize = Investment.sequelize;
    
    // Total investments count
    const totalInvestments = await Investment.count({
      where: { isActive: true }
    });

    // Count by status
    const byStatus = await Investment.findAll({
      where: { isActive: true },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Total principal invested
    const totalPrincipal = await Investment.sum('principal_amount', {
      where: { isActive: true }
    }) || 0;

    // Total current value
    const totalCurrentValue = await Investment.sum('current_value', {
      where: { isActive: true }
    }) || 0;

    // Total accrued interest
    const totalAccruedInterest = await Investment.sum('accrued_interest', {
      where: { isActive: true }
    }) || 0;

    // Active investments
    const activeInvestments = await Investment.count({
      where: { isActive: true, status: 'active' }
    });

    // Maturing soon (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const maturingSoon = await Investment.count({
      where: {
        isActive: true,
        status: 'active',
        maturityDate: {
          [sequelize.Sequelize.Op.lte]: thirtyDaysFromNow
        }
      }
    });

    res.json({
      success: true,
      data: {
        total: totalInvestments,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {}),
        totalPrincipal: parseFloat(totalPrincipal),
        totalCurrentValue: parseFloat(totalCurrentValue),
        totalAccruedInterest: parseFloat(totalAccruedInterest),
        activeInvestments,
        maturingSoon
      }
    });
  } catch (error) {
    console.error('Get investment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch investment statistics',
      error: error.message
    });
  }
};
