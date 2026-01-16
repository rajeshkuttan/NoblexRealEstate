const { Payment, Lease, Tenant } = require('../models');
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');

// Get all payments
const getAllPayments = async (req, res, next) => {
  try {
    const { search, status, method, leaseId, tenantId } = req.query;
    
    // Normalize pagination with max limit enforcement
    const { page, limit, offset } = normalizePagination(req.query, 10, 100);

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { paymentNumber: { [Op.like]: `%${search}%` } },
        { reference: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (method) whereClause.paymentMethod = method;
    if (leaseId) whereClause.leaseId = leaseId;
    if (tenantId) whereClause.tenantId = tenantId;

    const payments = await Payment.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Lease,
          as: 'lease',
          include: ['tenant', 'unit']
        },
        {
          model: Tenant,
          as: 'tenant'
        }
      ]
    });

    res.json({
      success: true,
      data: {
        payments: payments.rows,
        pagination: createPaginationMeta(payments.count, page, limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get payment by ID
const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByPk(id, {
      include: [
        {
          model: Lease,
          as: 'lease',
          include: ['tenant', 'unit']
        },
        {
          model: Tenant,
          as: 'tenant'
        }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// Create new payment
const createPayment = async (req, res, next) => {
  try {
    const paymentData = req.body;
    
    // Generate payment number
    const paymentCount = await Payment.count();
    paymentData.paymentNumber = `PAY-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(3, '0')}`;
    
    const payment = await Payment.create(paymentData);

    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// Update payment
const updatePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const payment = await Payment.findByPk(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    await payment.update(updateData);

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// Delete payment
const deletePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByPk(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    await payment.destroy();

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get payment statistics
const getPaymentStats = async (req, res, next) => {
  try {
    const totalPayments = await Payment.count();
    const paidPayments = await Payment.count({ where: { status: 'paid' } });
    const pendingPayments = await Payment.count({ where: { status: 'pending' } });
    const overduePayments = await Payment.count({ where: { status: 'overdue' } });

    // Calculate total amounts
    const totalAmount = await Payment.sum('amount', { where: { status: 'paid' } });
    const pendingAmount = await Payment.sum('amount', { where: { status: 'pending' } });
    const overdueAmount = await Payment.sum('amount', { where: { status: 'overdue' } });

    res.json({
      success: true,
      data: {
        counts: {
          total: totalPayments,
          paid: paidPayments,
          pending: pendingPayments,
          overdue: overduePayments
        },
        amounts: {
          total: totalAmount || 0,
          pending: pendingAmount || 0,
          overdue: overdueAmount || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get overdue payments
const getOverduePayments = async (req, res, next) => {
  try {
    const overduePayments = await Payment.findAll({
      where: {
        status: 'overdue',
        dueDate: {
          [Op.lt]: new Date()
        }
      },
      include: [
        {
          model: Lease,
          as: 'lease',
          include: ['tenant', 'unit']
        },
        {
          model: Tenant,
          as: 'tenant'
        }
      ],
      order: [['dueDate', 'ASC']]
    });

    res.json({
      success: true,
      data: overduePayments
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentStats,
  getOverduePayments
};
