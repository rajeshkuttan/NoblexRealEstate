/**
 * Standing Order Controller
 * Handles standing order operations
 */

const { StandingOrder, Lease, Tenant, BankAccount, Payment, User } = require('../models');
const { Op } = require('sequelize');
const standingOrderService = require('../services/standingOrderService');

/**
 * Get all standing orders
 */
exports.getAllStandingOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      tenantId,
      leaseId,
      frequency
    } = req.query;

    const whereClause = { isActive: true };
    
    if (status) whereClause.status = status;
    if (tenantId) whereClause.tenantId = tenantId;
    if (leaseId) whereClause.leaseId = leaseId;
    if (frequency) whereClause.frequency = frequency;

    const { count, rows: orders } = await StandingOrder.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Lease,
          as: 'lease',
          include: ['unit', 'tenant']
        },
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'email', 'mobile']
        },
        {
          model: BankAccount,
          as: 'bankAccount',
          attributes: ['id', 'bankName', 'accountName', 'accountNumber']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['nextScheduledDate', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get standing orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch standing orders',
      error: error.message
    });
  }
};

/**
 * Get standing order by ID
 */
exports.getStandingOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await StandingOrder.findByPk(id, {
      include: [
        {
          model: Lease,
          as: 'lease',
          include: ['unit', 'tenant', 'property']
        },
        {
          model: Tenant,
          as: 'tenant'
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
          as: 'mandateApprover',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Standing order not found'
      });
    }

    // Get payment history
    const payments = await Payment.findAll({
      where: {
        reference: order.orderNumber,
        isActive: true
      },
      order: [['paymentDate', 'DESC']],
      limit: 10
    });

    res.status(200).json({
      success: true,
      data: {
        ...order.toJSON(),
        recentPayments: payments
      }
    });
  } catch (error) {
    console.error('Get standing order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch standing order',
      error: error.message
    });
  }
};

/**
 * Create standing order
 */
exports.createStandingOrder = async (req, res) => {
  try {
    const {
      leaseId,
      tenantId,
      bankAccountId,
      amount,
      currency = 'AED',
      frequency,
      dayOfMonth,
      startDate,
      endDate,
      paymentMethod = 'bank_transfer',
      mandateReference,
      notifyTenant = true,
      notifyDaysBefore = 3,
      tenantBankDetails,
      notes
    } = req.body;

    // Validate lease exists and is active
    const lease = await Lease.findByPk(leaseId);
    if (!lease) {
      return res.status(404).json({
        success: false,
        message: 'Lease not found'
      });
    }

    // Generate order number
    const orderNumber = `SO-${Date.now()}`;

    // Calculate next scheduled date
    const start = new Date(startDate);
    const nextDate = new Date(start);
    
    switch (frequency) {
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'bi_weekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        if (dayOfMonth) {
          nextDate.setDate(Math.min(dayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
        }
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'semi_annual':
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case 'annual':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
    }

    const order = await StandingOrder.create({
      orderNumber,
      leaseId,
      tenantId,
      bankAccountId,
      amount,
      currency,
      frequency,
      dayOfMonth,
      startDate,
      endDate,
      nextScheduledDate: nextDate,
      paymentMethod,
      mandateReference,
      status: mandateReference ? 'active' : 'pending_approval',
      notifyTenant,
      notifyDaysBefore,
      tenantBankDetails,
      notes,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Standing order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Create standing order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create standing order',
      error: error.message
    });
  }
};

/**
 * Update standing order
 */
exports.updateStandingOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const order = await StandingOrder.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Standing order not found'
      });
    }

    // Don't allow certain fields to be updated if order is active and has been processed
    if (order.status === 'active' && order.lastProcessedDate) {
      const restrictedFields = ['amount', 'frequency', 'leaseId', 'tenantId'];
      const hasRestrictedUpdate = restrictedFields.some(field => updates.hasOwnProperty(field));
      
      if (hasRestrictedUpdate) {
        return res.status(400).json({
          success: false,
          message: 'Cannot modify core details of an active order that has been processed. Please create a new order instead.'
        });
      }
    }

    await order.update(updates);

    res.status(200).json({
      success: true,
      message: 'Standing order updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Update standing order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update standing order',
      error: error.message
    });
  }
};

/**
 * Approve standing order mandate
 */
exports.approveMandate = async (req, res) => {
  try {
    const { id } = req.params;
    const { mandateReference } = req.body;

    const order = await StandingOrder.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Standing order not found'
      });
    }

    if (order.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: 'Order is not pending approval'
      });
    }

    await order.update({
      status: 'active',
      mandateReference: mandateReference || order.mandateReference,
      mandateApprovedAt: new Date(),
      mandateApprovedBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Standing order approved successfully',
      data: order
    });
  } catch (error) {
    console.error('Approve mandate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve mandate',
      error: error.message
    });
  }
};

/**
 * Pause standing order
 */
exports.pauseStandingOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await StandingOrder.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Standing order not found'
      });
    }

    if (order.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active orders can be paused'
      });
    }

    await order.update({
      status: 'paused',
      notes: `${order.notes || ''}\nPaused: ${reason || 'Manual pause'} (${new Date().toLocaleDateString()})`
    });

    res.status(200).json({
      success: true,
      message: 'Standing order paused successfully',
      data: order
    });
  } catch (error) {
    console.error('Pause standing order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to pause standing order',
      error: error.message
    });
  }
};

/**
 * Resume standing order
 */
exports.resumeStandingOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await StandingOrder.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Standing order not found'
      });
    }

    if (order.status !== 'paused') {
      return res.status(400).json({
        success: false,
        message: 'Only paused orders can be resumed'
      });
    }

    await order.update({
      status: 'active',
      retryCount: 0,
      lastFailureReason: null,
      notes: `${order.notes || ''}\nResumed: ${new Date().toLocaleDateString()}`
    });

    res.status(200).json({
      success: true,
      message: 'Standing order resumed successfully',
      data: order
    });
  } catch (error) {
    console.error('Resume standing order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resume standing order',
      error: error.message
    });
  }
};

/**
 * Cancel standing order
 */
exports.cancelStandingOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await StandingOrder.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Standing order not found'
      });
    }

    await order.update({
      status: 'cancelled',
      notes: `${order.notes || ''}\nCancelled: ${reason || 'Manual cancellation'} (${new Date().toLocaleDateString()})`
    });

    res.status(200).json({
      success: true,
      message: 'Standing order cancelled successfully',
      data: order
    });
  } catch (error) {
    console.error('Cancel standing order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel standing order',
      error: error.message
    });
  }
};

/**
 * Process standing order manually
 */
exports.processOrderManually = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await standingOrderService.processOrderManually(parseInt(id));

    res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('Process order manually error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process order',
      error: error.message
    });
  }
};

/**
 * Get standing order statistics
 */
exports.getStandingOrderStats = async (req, res) => {
  try {
    const totalActive = await StandingOrder.count({
      where: { status: 'active', isActive: true }
    });

    const totalPaused = await StandingOrder.count({
      where: { status: 'paused', isActive: true }
    });

    const totalPendingApproval = await StandingOrder.count({
      where: { status: 'pending_approval', isActive: true }
    });

    const totalProcessed = await StandingOrder.sum('totalProcessed', {
      where: { isActive: true }
    });

    const totalFailed = await StandingOrder.sum('totalFailed', {
      where: { isActive: true }
    });

    // Upcoming in next 7 days
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingPayments = await StandingOrder.findAll({
      where: {
        status: 'active',
        isActive: true,
        nextScheduledDate: {
          [Op.between]: [new Date(), nextWeek]
        }
      },
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['name']
        }
      ],
      order: [['nextScheduledDate', 'ASC']],
      limit: 10
    });

    // Monthly recurring revenue
    const monthlyRevenue = await StandingOrder.sum('amount', {
      where: {
        status: 'active',
        frequency: 'monthly',
        isActive: true
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalActive,
        totalPaused,
        totalPendingApproval,
        totalProcessed: totalProcessed || 0,
        totalFailed: totalFailed || 0,
        successRate: totalProcessed && totalFailed 
          ? ((totalProcessed / (totalProcessed + totalFailed)) * 100).toFixed(2)
          : 100,
        monthlyRecurringRevenue: monthlyRevenue || 0,
        upcomingPayments
      }
    });
  } catch (error) {
    console.error('Get standing order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

/**
 * Delete standing order (soft delete)
 */
exports.deleteStandingOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await StandingOrder.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Standing order not found'
      });
    }

    // Only allow deletion if not active or has no processed payments
    if (order.status === 'active' && order.totalProcessed > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an active order with processed payments. Please cancel it instead.'
      });
    }

    await order.update({ isActive: false });

    res.status(200).json({
      success: true,
      message: 'Standing order deleted successfully'
    });
  } catch (error) {
    console.error('Delete standing order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete standing order',
      error: error.message
    });
  }
};
