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
          include: [
            'tenant', 
            {
              association: 'unit',
              include: ['property']
            }
          ]
        },
        {
          model: Tenant,
          as: 'tenant'
        },
        {
          model: require('../models').Cheque,
          as: 'cheques'
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
        },
        {
          model: require('../models').Cheque, // Lazy load to avoid circular dep issues in controller top
          as: 'cheques'
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
    const { selectedPDC } = invoiceData; // Extract selected PDCs
    
    // Generate invoice number
    const invoiceCount = await Invoice.count();
    invoiceData.invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(3, '0')}`;
    
    const invoice = await Invoice.create(invoiceData);

    // If PDCs are selected, update them with the new invoice ID
    if (selectedPDC && Array.isArray(selectedPDC) && selectedPDC.length > 0) {
      const { Cheque } = require('../models');
      
      // Handle array of objects (standard) or array of IDs (fallback)
      const pdcIds = selectedPDC.map(pdc => {
        if (typeof pdc === 'object' && pdc !== null) {
          return pdc.id;
        }
        return pdc; // Assuming it's an ID if not an object
      }).filter(id => id); // Filter out any undefined/null

      if (pdcIds.length > 0) {
        await Cheque.update(
          { invoiceId: invoice.id },
          { 
            where: { 
              id: { [Op.in]: pdcIds } 
            } 
          }
        );
      }
    }


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

    // Decouple PDCs/Cheques before deleting
    // We need to require Cheque model here if not at top, or use association
    const { Cheque } = require('../models');
    await Cheque.update(
      { invoiceId: null },
      { where: { invoiceId: id } }
    );

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

// Duplicate invoice
const duplicateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sourceInvoice = await Invoice.findByPk(id);

    if (!sourceInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Source invoice not found'
      });
    }

    // Generate new invoice number safely
    const lastInvoice = await Invoice.findOne({
      order: [['id', 'DESC']]
    });
    
    let nextNum = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
       const parts = lastInvoice.invoiceNumber.split('-');
       if (parts.length === 3 && !isNaN(parseInt(parts[2]))) {
         nextNum = parseInt(parts[2]) + 1;
       }
    }
    
    const newInvoiceNumber = `INV-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;
    
    // Explicitly construct data to avoid copying unique fields/IDs
    const invoiceData = {
      invoiceNumber: newInvoiceNumber,
      status: 'draft', // Corrected from 'pending' to 'draft' to match ENUM
      invoiceDate: new Date(), 
      dueDate: sourceInvoice.dueDate, 
      period: sourceInvoice.period, 
      leaseId: sourceInvoice.leaseId,
      tenantId: sourceInvoice.tenantId,
      description: sourceInvoice.description,
      items: sourceInvoice.items, 
      subtotal: sourceInvoice.subtotal,
      taxRate: sourceInvoice.taxRate, 
      taxAmount: sourceInvoice.taxAmount, 
      totalAmount: sourceInvoice.totalAmount,
      notes: `Duplicated from ${sourceInvoice.invoiceNumber}. ` + (sourceInvoice.notes || ''),
      // copy other fields if they exist in schema
      vendorInvoiceNumber: null,
      purchaseOrderNumber: null
    };

    const newInvoice = await Invoice.create(invoiceData);

    res.status(201).json({
      success: true,
      message: 'Invoice duplicated successfully',
      data: newInvoice
    });
  } catch (error) {
    console.error("Duplicate Error:", error);
    next(error);
  }
};

// Send invoice reminder
const sendReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id, {
      include: [{ model: Tenant, as: 'tenant' }]
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    if (!invoice.tenant || !invoice.tenant.email) {
      return res.status(400).json({
        success: false,
        message: 'Tenant email address is missing. Cannot send reminder.'
      });
    }

    // Simulate sending email
    console.log(`Sending reminder for Invoice ${invoice.invoiceNumber} to ${invoice.tenant.email}`);
    
    // Log the reminder in invoice notes (simple audit trail)
    const today = new Date().toLocaleDateString('en-AE');
    const note = `Reminder sent on ${today}. `;
    await invoice.update({ 
      notes: (invoice.notes || '') + '\n' + note 
    });

    res.json({
      success: true,
      message: `Reminder sent successfully to ${invoice.tenant.email}`
    });
  } catch (error) {
    next(error);
  }
};

// Get invoice history
const getInvoiceHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Construct history from available data
    // In a full system, we might query an AuditLog table. 
    // Here we derive it from related entities.
    const history = [];

    // 1. Creation
    history.push({
      type: 'created',
      date: invoice.createdAt,
      description: 'Invoice created',
      user: 'System' // Or createdBy if available
    });

    // 2. Last Status Update (Approximation based on updatedAt)
    if (invoice.updatedAt > invoice.createdAt) {
       history.push({
        type: 'updated',
        date: invoice.updatedAt,
        description: `Invoice updated (Status: ${invoice.status})`,
        user: 'System'
      });
    }
    
    // 3. Payment info (if paid)
    if (invoice.paidDate) {
      history.push({
        type: 'payment',
        date: invoice.paidDate,
        description: `Payment received via ${invoice.paymentMethod || 'Unknown method'}`,
        user: 'Finance'
      });
    }

    // Sort by date descending
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: history
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
  getOverdueInvoices,
  duplicateInvoice,
  sendReminder,
  getInvoiceHistory
};
