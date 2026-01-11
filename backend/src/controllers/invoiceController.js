const { Invoice, Lease, Tenant } = require('../models');
const { Op } = require('sequelize');

// Get all invoices
const getAllInvoices = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status, leaseId, tenantId } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { invoiceNumber: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (leaseId) whereClause.leaseId = leaseId;
    if (tenantId) whereClause.tenantId = tenantId;

    const invoices = await Invoice.findAndCountAll({
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
        invoices: invoices.rows,
        pagination: {
          total: invoices.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(invoices.count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get invoice by ID
const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id, {
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

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

// Create new invoice
const createInvoice = async (req, res, next) => {
  try {
    const invoiceData = req.body;
    
    // Generate invoice number
    const invoiceCount = await Invoice.count();
    invoiceData.invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(3, '0')}`;
    
    const invoice = await Invoice.create(invoiceData);

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

// Update invoice
const updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    await invoice.update(updateData);

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

// Delete invoice
const deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    await invoice.destroy();

    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get invoice statistics
const getInvoiceStats = async (req, res, next) => {
  try {
    const totalInvoices = await Invoice.count();
    const paidInvoices = await Invoice.count({ where: { status: 'paid' } });
    const pendingInvoices = await Invoice.count({ where: { status: 'sent' } });
    const overdueInvoices = await Invoice.count({ where: { status: 'overdue' } });

    // Calculate total amounts
    const totalAmount = await Invoice.sum('totalAmount', { where: { status: 'paid' } });
    const pendingAmount = await Invoice.sum('totalAmount', { where: { status: 'sent' } });
    const overdueAmount = await Invoice.sum('totalAmount', { where: { status: 'overdue' } });

    res.json({
      success: true,
      data: {
        counts: {
          total: totalInvoices,
          paid: paidInvoices,
          pending: pendingInvoices,
          overdue: overdueInvoices
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

// Get overdue invoices
const getOverdueInvoices = async (req, res, next) => {
  try {
    const overdueInvoices = await Invoice.findAll({
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
      data: overdueInvoices
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoiceStats,
  getOverdueInvoices
};
