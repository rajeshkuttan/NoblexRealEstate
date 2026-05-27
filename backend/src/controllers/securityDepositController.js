/**
 * Security Deposit Controller
 * Handles security deposit tracking and management
 */

const { SecurityDeposit, Lease, Tenant, Property, BankAccount, Cheque, User } = require('../models');
const { Op } = require('sequelize');
const {
  companyWhere,
  withCompanyId,
  assertLeaseInCompany,
  assertTenantInCompany,
  assertRecordInCompany,
} = require('../utils/companyScope');

/**
 * Get all security deposits
 */
exports.getAllSecurityDeposits = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      tenantId,
      propertyId,
      leaseId,
      sortBy = 'depositDate',
      sortOrder = 'DESC'
    } = req.query;

    const whereClause = { isActive: true, ...companyWhere(req) };
    
    if (status) whereClause.status = status;
    if (tenantId) whereClause.tenantId = tenantId;
    if (propertyId) whereClause.propertyId = propertyId;
    if (leaseId) whereClause.leaseId = leaseId;

    const { count, rows: deposits } = await SecurityDeposit.findAndCountAll({
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
          attributes: ['id', 'leaseNumber', 'startDate', 'endDate'],
          include: ['unit']
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'location']
        },
        {
          model: BankAccount,
          as: 'bankAccount',
          attributes: ['id', 'bankName', 'accountName']
        },
        {
          model: Cheque,
          as: 'cheque',
          attributes: ['id', 'chequeNumber', 'amount']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [[sortBy, sortOrder]]
    });

    res.status(200).json({
      success: true,
      data: {
        deposits,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get security deposits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security deposits',
      error: error.message
    });
  }
};

/**
 * Get security deposit by ID
 */
exports.getSecurityDepositById = async (req, res) => {
  try {
    const { id } = req.params;

    const deposit = await SecurityDeposit.findByPk(id, {
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
          model: Property,
          as: 'property'
        },
        {
          model: BankAccount,
          as: 'bankAccount'
        },
        {
          model: Cheque,
          as: 'cheque'
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'releaser',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'inspector',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: 'Security deposit not found'
      });
    }

    res.status(200).json({
      success: true,
      data: deposit
    });
  } catch (error) {
    console.error('Get security deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security deposit',
      error: error.message
    });
  }
};

/**
 * Create security deposit
 */
exports.createSecurityDeposit = async (req, res) => {
  try {
    const {
      leaseId,
      tenantId,
      propertyId,
      bankAccountId,
      amount,
      currency = 'AED',
      depositDate,
      paymentMethod = 'cheque',
      chequeId,
      interestRate = 0,
      inspectionRequired = true,
      notes
    } = req.body;

    if (leaseId) await assertLeaseInCompany(leaseId, req);
    if (tenantId) await assertTenantInCompany(tenantId, req);

    // Generate deposit number
    const depositNumber = `DEP-${Date.now()}`;

    // Calculate accrued interest if applicable
    let accruedInterest = 0;
    if (interestRate > 0) {
      const daysSinceDeposit = Math.floor((new Date() - new Date(depositDate)) / (1000 * 60 * 60 * 24));
      const years = daysSinceDeposit / 365;
      accruedInterest = amount * (interestRate / 100) * years;
    }

    const deposit = await SecurityDeposit.create(withCompanyId(req, {
      depositNumber,
      leaseId,
      tenantId,
      propertyId,
      bankAccountId,
      amount,
      currency,
      depositDate,
      paymentMethod,
      chequeId,
      interestRate,
      accruedInterest,
      inspectionRequired,
      inspectionStatus: inspectionRequired ? 'pending' : null,
      notes,
      createdBy: req.user.id
    }));

    res.status(201).json({
      success: true,
      message: 'Security deposit created successfully',
      data: deposit
    });
  } catch (error) {
    console.error('Create security deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create security deposit',
      error: error.message
    });
  }
};

/**
 * Update security deposit
 */
exports.updateSecurityDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const deposit = await SecurityDeposit.findByPk(id);
    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: 'Security deposit not found'
      });
    }

    // Don't allow updating released deposits
    if (['released', 'forfeited'].includes(deposit.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot update a ${deposit.status} deposit`
      });
    }

    await deposit.update(updates);

    res.status(200).json({
      success: true,
      message: 'Security deposit updated successfully',
      data: deposit
    });
  } catch (error) {
    console.error('Update security deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update security deposit',
      error: error.message
    });
  }
};

/**
 * Schedule inspection
 */
exports.scheduleInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const { inspectionDate, inspectedBy } = req.body;

    const deposit = await SecurityDeposit.findByPk(id);
    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: 'Security deposit not found'
      });
    }

    if (deposit.status !== 'held') {
      return res.status(400).json({
        success: false,
        message: 'Can only schedule inspection for held deposits'
      });
    }

    await deposit.update({
      inspectionDate,
      inspectedBy,
      inspectionStatus: 'scheduled'
    });

    res.status(200).json({
      success: true,
      message: 'Inspection scheduled successfully',
      data: deposit
    });
  } catch (error) {
    console.error('Schedule inspection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule inspection',
      error: error.message
    });
  }
};

/**
 * Complete inspection
 */
exports.completeInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const { inspectionNotes, deductionAmount = 0, deductionReason } = req.body;

    const deposit = await SecurityDeposit.findByPk(id);
    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: 'Security deposit not found'
      });
    }

    if (deposit.inspectionStatus !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Inspection must be scheduled first'
      });
    }

    await deposit.update({
      inspectionStatus: 'completed',
      inspectionNotes,
      deductionAmount,
      deductionReason,
      releaseAmount: deposit.amount + deposit.accruedInterest - deductionAmount
    });

    res.status(200).json({
      success: true,
      message: 'Inspection completed successfully',
      data: deposit
    });
  } catch (error) {
    console.error('Complete inspection error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete inspection',
      error: error.message
    });
  }
};

/**
 * Release deposit
 */
exports.releaseDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const { releaseMethod = 'bank_transfer', releaseReference, releaseDate } = req.body;

    const deposit = await assertRecordInCompany(SecurityDeposit, id, req);

    if (deposit.status !== 'held') {
      return res.status(400).json({
        success: false,
        message: 'Can only release held deposits'
      });
    }

    // Check inspection requirement
    if (deposit.inspectionRequired && deposit.inspectionStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Inspection must be completed before releasing deposit'
      });
    }

    await deposit.update({
      status: 'released',
      releaseDate: releaseDate || new Date(),
      releaseMethod,
      releaseReference,
      releasedBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Security deposit released successfully',
      data: deposit
    });
  } catch (error) {
    console.error('Release deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to release deposit',
      error: error.message
    });
  }
};

/**
 * Forfeit deposit
 */
exports.forfeitDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const deposit = await assertRecordInCompany(SecurityDeposit, id, req);

    if (deposit.status !== 'held') {
      return res.status(400).json({
        success: false,
        message: 'Can only forfeit held deposits'
      });
    }

    await deposit.update({
      status: 'forfeited',
      deductionAmount: deposit.amount,
      deductionReason: reason,
      releaseAmount: 0,
      releasedBy: req.user.id,
      releaseDate: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Security deposit forfeited',
      data: deposit
    });
  } catch (error) {
    console.error('Forfeit deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to forfeit deposit',
      error: error.message
    });
  }
};

/**
 * Partial release
 */
exports.partialRelease = async (req, res) => {
  try {
    const { id } = req.params;
    const { releaseAmount, releaseMethod, releaseReference, reason } = req.body;

    const deposit = await assertRecordInCompany(SecurityDeposit, id, req);

    if (deposit.status !== 'held') {
      return res.status(400).json({
        success: false,
        message: 'Can only partially release held deposits'
      });
    }

    const currentReleased = deposit.releaseAmount || 0;
    const totalAvailable = deposit.amount + deposit.accruedInterest;
    
    if (currentReleased + releaseAmount > totalAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Release amount exceeds available balance'
      });
    }

    await deposit.update({
      status: 'partially_released',
      releaseAmount: currentReleased + releaseAmount,
      releaseMethod,
      releaseReference,
      notes: `${deposit.notes || ''}\nPartial release: ${releaseAmount} (${reason})`
    });

    res.status(200).json({
      success: true,
      message: 'Partial release processed successfully',
      data: deposit
    });
  } catch (error) {
    console.error('Partial release error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process partial release',
      error: error.message
    });
  }
};

/**
 * Calculate accrued interest
 */
exports.calculateAccruedInterest = async (req, res) => {
  try {
    const { id } = req.params;

    const deposit = await SecurityDeposit.findByPk(id);
    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: 'Security deposit not found'
      });
    }

    if (deposit.interestRate === 0) {
      return res.status(200).json({
        success: true,
        data: {
          accruedInterest: 0,
          message: 'No interest rate set for this deposit'
        }
      });
    }

    const daysSinceDeposit = Math.floor((new Date() - new Date(deposit.depositDate)) / (1000 * 60 * 60 * 24));
    const years = daysSinceDeposit / 365;
    const accruedInterest = deposit.amount * (deposit.interestRate / 100) * years;

    // Update the deposit with new accrued interest
    await deposit.update({ accruedInterest });

    res.status(200).json({
      success: true,
      data: {
        amount: deposit.amount,
        interestRate: deposit.interestRate,
        daysSinceDeposit,
        accruedInterest: parseFloat(accruedInterest.toFixed(2)),
        totalValue: parseFloat((deposit.amount + accruedInterest).toFixed(2))
      }
    });
  } catch (error) {
    console.error('Calculate accrued interest error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate accrued interest',
      error: error.message
    });
  }
};

/**
 * Get security deposit statistics
 */
exports.getSecurityDepositStats = async (req, res) => {
  try {
    const totalDeposits = await SecurityDeposit.count({ where: { isActive: true } });
    const heldDeposits = await SecurityDeposit.count({ where: { status: 'held', isActive: true } });
    const releasedDeposits = await SecurityDeposit.count({ where: { status: 'released', isActive: true } });
    const forfeitedDeposits = await SecurityDeposit.count({ where: { status: 'forfeited', isActive: true } });

    const totalAmount = await SecurityDeposit.sum('amount', { where: { isActive: true } });
    const heldAmount = await SecurityDeposit.sum('amount', { where: { status: 'held', isActive: true } });
    const releasedAmount = await SecurityDeposit.sum('releaseAmount', { where: { status: 'released', isActive: true } });
    const forfeitedAmount = await SecurityDeposit.sum('amount', { where: { status: 'forfeited', isActive: true } });

    const totalInterest = await SecurityDeposit.sum('accruedInterest', { where: { status: 'held', isActive: true } });

    // Pending inspections
    const pendingInspections = await SecurityDeposit.count({
      where: {
        inspectionStatus: 'pending',
        status: 'held',
        isActive: true
      }
    });

    const scheduledInspections = await SecurityDeposit.count({
      where: {
        inspectionStatus: 'scheduled',
        status: 'held',
        isActive: true
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalDeposits,
        heldDeposits,
        releasedDeposits,
        forfeitedDeposits,
        totalAmount: totalAmount || 0,
        heldAmount: heldAmount || 0,
        releasedAmount: releasedAmount || 0,
        forfeitedAmount: forfeitedAmount || 0,
        totalInterest: totalInterest || 0,
        pendingInspections,
        scheduledInspections
      }
    });
  } catch (error) {
    console.error('Get security deposit stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

/**
 * Get deposits by property
 */
exports.getDepositsByProperty = async (req, res) => {
  try {
    const deposits = await SecurityDeposit.findAll({
      where: { isActive: true, status: 'held' },
      include: [
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'location']
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name']
        }
      ],
      order: [['property', 'title', 'ASC']]
    });

    // Group by property
    const groupedByProperty = deposits.reduce((acc, deposit) => {
      const propertyId = deposit.propertyId;
      if (!acc[propertyId]) {
        acc[propertyId] = {
          property: deposit.property,
          deposits: [],
          totalAmount: 0,
          count: 0
        };
      }
      acc[propertyId].deposits.push(deposit);
      acc[propertyId].totalAmount += parseFloat(deposit.amount);
      acc[propertyId].count += 1;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: Object.values(groupedByProperty)
    });
  } catch (error) {
    console.error('Get deposits by property error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch deposits by property',
      error: error.message
    });
  }
};

/**
 * Delete security deposit (soft delete)
 */
exports.deleteSecurityDeposit = async (req, res) => {
  try {
    const { id } = req.params;

    const deposit = await assertRecordInCompany(SecurityDeposit, id, req);

    // Only allow deletion of held deposits with no releases
    if (deposit.status !== 'held' || deposit.releaseAmount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Can only delete held deposits with no releases'
      });
    }

    await deposit.update({ isActive: false });

    res.status(200).json({
      success: true,
      message: 'Security deposit deleted successfully'
    });
  } catch (error) {
    console.error('Delete security deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete security deposit',
      error: error.message
    });
  }
};
