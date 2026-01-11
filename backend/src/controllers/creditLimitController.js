const { CreditLimit, Tenant } = require('../models');
const { Op } = require('sequelize');
const creditManagementService = require('../services/creditManagementService');

exports.getAllCreditLimits = async (req, res) => {
  try {
    const { page = 1, limit = 20, riskLevel, collectionStage } = req.query;
    const whereClause = { isActive: true };
    if (riskLevel) whereClause.riskLevel = riskLevel;
    if (collectionStage) whereClause.collectionStage = collectionStage;

    const { count, rows: limits } = await CreditLimit.findAndCountAll({
      where: whereClause,
      include: [{ model: Tenant, as: 'tenant', attributes: ['id', 'name', 'email', 'mobile'] }],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['creditScore', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: { limits, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) } }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch credit limits', error: error.message });
  }
};

exports.getCreditLimitByTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    let creditLimit = await CreditLimit.findOne({
      where: { tenantId, isActive: true },
      include: [{ model: Tenant, as: 'tenant' }]
    });

    if (!creditLimit) {
      creditLimit = await creditManagementService.updateCreditLimit(tenantId);
    }

    res.status(200).json({ success: true, data: creditLimit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch credit limit', error: error.message });
  }
};

exports.updateCreditLimit = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { creditLimit: newLimit, notes } = req.body;

    let creditLimit = await CreditLimit.findOne({ where: { tenantId, isActive: true } });
    if (!creditLimit) {
      return res.status(404).json({ success: false, message: 'Credit limit not found' });
    }

    await creditLimit.update({
      creditLimit: newLimit,
      availableCredit: Math.max(0, newLimit - creditLimit.currentBalance),
      notes,
      approvedBy: req.user.id,
      approvedAt: new Date(),
      lastReviewDate: new Date(),
      nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    });

    res.status(200).json({ success: true, message: 'Credit limit updated', data: creditLimit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update credit limit', error: error.message });
  }
};

exports.putOnHold = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { reason } = req.body;

    const creditLimit = await CreditLimit.findOne({ where: { tenantId, isActive: true } });
    if (!creditLimit) {
      return res.status(404).json({ success: false, message: 'Credit limit not found' });
    }

    await creditLimit.update({ creditHold: true, creditHoldReason: reason });
    res.status(200).json({ success: true, message: 'Credit put on hold', data: creditLimit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to put credit on hold', error: error.message });
  }
};

exports.removeHold = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const creditLimit = await CreditLimit.findOne({ where: { tenantId, isActive: true } });
    if (!creditLimit) {
      return res.status(404).json({ success: false, message: 'Credit limit not found' });
    }

    await creditLimit.update({ creditHold: false, creditHoldReason: null });
    res.status(200).json({ success: true, message: 'Credit hold removed', data: creditLimit });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove hold', error: error.message });
  }
};

exports.refreshAllLimits = async (req, res) => {
  try {
    await creditManagementService.updateAllCreditLimits();
    res.status(200).json({ success: true, message: 'All credit limits refreshed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to refresh limits', error: error.message });
  }
};

exports.getCreditStats = async (req, res) => {
  try {
    const stats = await creditManagementService.getCreditStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats', error: error.message });
  }
};
