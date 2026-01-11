/**
 * Vendor Invoice Controller
 * Handles vendor invoice and accounts payable operations
 * Part of: Phase 3.1 - Vendor/AP APIs
 */

const { VendorInvoice, Vendor, Property, User, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all vendor invoices with filters and pagination
 */
exports.getAllVendorInvoices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      vendorId = '',
      propertyId = '',
      status = '',
      paymentStatus = '',
      startDate = '',
      endDate = '',
      sortBy = 'invoice_date',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {
      isActive: true
    };

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { invoice_number: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // Vendor filter
    if (vendorId) {
      whereClause.vendor_id = vendorId;
    }

    // Property filter
    if (propertyId) {
      whereClause.property_id = propertyId;
    }

    // Status filters
    if (status) {
      whereClause.status = status;
    }

    if (paymentStatus) {
      whereClause.payment_status = paymentStatus;
    }

    // Date range filter
    if (startDate && endDate) {
      whereClause.invoice_date = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereClause.invoice_date = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereClause.invoice_date = {
        [Op.lte]: new Date(endDate)
      };
    }

    // Get invoices with associations
    const { count, rows: invoices } = await VendorInvoice.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'vendorName', 'email', 'contactPerson', 'paymentTerms']
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'location'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      distinct: true
    });

    res.status(200).json({
      success: true,
      data: {
        invoices,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all vendor invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor invoices',
      error: error.message
    });
  }
};

/**
 * Get vendor invoice by ID
 */
exports.getVendorInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await VendorInvoice.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: Vendor,
          as: 'vendor',
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'name', 'email']
            }
          ]
        },
        {
          model: Property,
          as: 'property',
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Vendor invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Get vendor invoice by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor invoice',
      error: error.message
    });
  }
};

/**
 * Create new vendor invoice
 */
exports.createVendorInvoice = async (req, res) => {
  try {
    const {
      invoiceNumber,
      vendorId,
      propertyId,
      invoiceDate,
      dueDate,
      subtotal,
      taxAmount,
      totalAmount,
      description,
      attachments
    } = req.body;

    // Check for duplicate invoice number
    const existingInvoice = await VendorInvoice.findOne({
      where: { invoiceNumber, isActive: true }
    });

    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: 'Invoice with this number already exists'
      });
    }

    // Verify vendor exists
    const vendor = await Vendor.findOne({
      where: { id: vendorId, isActive: true }
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Create invoice
    const invoice = await VendorInvoice.create({
      invoiceNumber,
      vendorId,
      propertyId: propertyId || null,
      invoiceDate: new Date(invoiceDate),
      dueDate: new Date(dueDate),
      subtotal: parseFloat(subtotal),
      taxAmount: parseFloat(taxAmount || 0),
      totalAmount: parseFloat(totalAmount),
      status: 'draft',
      paymentStatus: 'unpaid',
      description,
      attachments: attachments || null,
      createdBy: req.user.id
    });

    // Fetch created invoice with associations
    const createdInvoice = await VendorInvoice.findByPk(invoice.id, {
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'vendorName', 'email', 'contactPerson']
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Vendor invoice created successfully',
      data: createdInvoice
    });
  } catch (error) {
    console.error('Create vendor invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vendor invoice',
      error: error.message
    });
  }
};

/**
 * Update vendor invoice
 */
exports.updateVendorInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      invoiceNumber,
      vendorId,
      propertyId,
      invoiceDate,
      dueDate,
      subtotal,
      taxAmount,
      totalAmount,
      description,
      attachments
    } = req.body;

    // Find invoice
    const invoice = await VendorInvoice.findOne({
      where: { id, isActive: true }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Vendor invoice not found'
      });
    }

    // Check if invoice is in editable status
    if (invoice.status === 'approved' || invoice.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit invoice in ${invoice.status} status`
      });
    }

    // Check for duplicate invoice number (excluding current invoice)
    if (invoiceNumber && invoiceNumber !== invoice.invoiceNumber) {
      const existingInvoice = await VendorInvoice.findOne({
        where: {
          invoiceNumber,
          isActive: true,
          id: { [Op.ne]: id }
        }
      });

      if (existingInvoice) {
        return res.status(400).json({
          success: false,
          message: 'Invoice with this number already exists'
        });
      }
    }

    // Update invoice
    await invoice.update({
      invoiceNumber: invoiceNumber || invoice.invoiceNumber,
      vendorId: vendorId || invoice.vendorId,
      propertyId: propertyId !== undefined ? propertyId : invoice.propertyId,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : invoice.invoiceDate,
      dueDate: dueDate ? new Date(dueDate) : invoice.dueDate,
      subtotal: subtotal !== undefined ? parseFloat(subtotal) : invoice.subtotal,
      taxAmount: taxAmount !== undefined ? parseFloat(taxAmount) : invoice.taxAmount,
      totalAmount: totalAmount !== undefined ? parseFloat(totalAmount) : invoice.totalAmount,
      description: description !== undefined ? description : invoice.description,
      attachments: attachments !== undefined ? attachments : invoice.attachments
    });

    // Fetch updated invoice with associations
    const updatedInvoice = await VendorInvoice.findByPk(id, {
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'vendorName', 'email']
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Vendor invoice updated successfully',
      data: updatedInvoice
    });
  } catch (error) {
    console.error('Update vendor invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vendor invoice',
      error: error.message
    });
  }
};

/**
 * Approve/Reject vendor invoice
 */
exports.approveVendorInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // action: 'approve' or 'reject'

    // Find invoice
    const invoice = await VendorInvoice.findOne({
      where: { id, isActive: true }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Vendor invoice not found'
      });
    }

    // Check if invoice is pending approval
    if (invoice.status !== 'pending_approval') {
      return res.status(400).json({
        success: false,
        message: `Invoice is in ${invoice.status} status and cannot be approved/rejected`
      });
    }

    if (action === 'approve') {
      await invoice.update({
        status: 'approved',
        approvedBy: req.user.id,
        approvedAt: new Date(),
        description: notes ? `${invoice.description || ''}\nApproval Notes: ${notes}` : invoice.description
      });

      res.status(200).json({
        success: true,
        message: 'Vendor invoice approved successfully',
        data: invoice
      });
    } else if (action === 'reject') {
      await invoice.update({
        status: 'rejected',
        approvedBy: req.user.id,
        approvedAt: new Date(),
        description: notes ? `${invoice.description || ''}\nRejection Reason: ${notes}` : invoice.description
      });

      res.status(200).json({
        success: true,
        message: 'Vendor invoice rejected',
        data: invoice
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "approve" or "reject"'
      });
    }
  } catch (error) {
    console.error('Approve vendor invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process invoice approval',
      error: error.message
    });
  }
};

/**
 * Submit invoice for approval
 */
exports.submitForApproval = async (req, res) => {
  try {
    const { id } = req.params;

    // Find invoice
    const invoice = await VendorInvoice.findOne({
      where: { id, isActive: true }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Vendor invoice not found'
      });
    }

    // Check if invoice is in draft status
    if (invoice.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Cannot submit invoice in ${invoice.status} status`
      });
    }

    // Update status to pending approval
    await invoice.update({
      status: 'pending_approval'
    });

    res.status(200).json({
      success: true,
      message: 'Invoice submitted for approval successfully',
      data: invoice
    });
  } catch (error) {
    console.error('Submit for approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit invoice for approval',
      error: error.message
    });
  }
};

/**
 * Delete vendor invoice (soft delete)
 */
exports.deleteVendorInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    // Find invoice
    const invoice = await VendorInvoice.findOne({
      where: { id, isActive: true }
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Vendor invoice not found'
      });
    }

    // Check if invoice can be deleted
    if (invoice.paymentStatus === 'paid' || invoice.paymentStatus === 'partially_paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete invoice with payments. Please reverse payments first.'
      });
    }

    // Soft delete
    await invoice.update({ isActive: false });

    res.status(200).json({
      success: true,
      message: 'Vendor invoice deleted successfully'
    });
  } catch (error) {
    console.error('Delete vendor invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vendor invoice',
      error: error.message
    });
  }
};

/**
 * Get accounts payable aging report
 */
exports.getAgingReport = async (req, res) => {
  try {
    const { vendorId = '', propertyId = '' } = req.query;

    // Build where clause
    const whereClause = {
      isActive: true,
      payment_status: { [Op.in]: ['unpaid', 'partially_paid', 'overdue'] },
      status: 'approved'
    };

    if (vendorId) {
      whereClause.vendor_id = vendorId;
    }

    if (propertyId) {
      whereClause.property_id = propertyId;
    }

    // Get all unpaid/partially paid invoices
    const invoices = await VendorInvoice.findAll({
      where: whereClause,
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'vendorName', 'email', 'contactPerson']
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title'],
          required: false
        }
      ],
      order: [['due_date', 'ASC']]
    });

    // Calculate aging buckets
    const today = new Date();
    const agingData = {
      current: [], // Not yet due
      days_30: [], // 1-30 days overdue
      days_60: [], // 31-60 days overdue
      days_90: [], // 61-90 days overdue
      days_90_plus: [] // 90+ days overdue
    };

    const totals = {
      current: 0,
      days_30: 0,
      days_60: 0,
      days_90: 0,
      days_90_plus: 0,
      total: 0
    };

    invoices.forEach(invoice => {
      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      const amount = parseFloat(invoice.totalAmount);

      const invoiceData = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        vendor: invoice.vendor,
        property: invoice.property,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        totalAmount: amount,
        daysOverdue: daysOverdue > 0 ? daysOverdue : 0
      };

      if (daysOverdue <= 0) {
        agingData.current.push(invoiceData);
        totals.current += amount;
      } else if (daysOverdue <= 30) {
        agingData.days_30.push(invoiceData);
        totals.days_30 += amount;
      } else if (daysOverdue <= 60) {
        agingData.days_60.push(invoiceData);
        totals.days_60 += amount;
      } else if (daysOverdue <= 90) {
        agingData.days_90.push(invoiceData);
        totals.days_90 += amount;
      } else {
        agingData.days_90_plus.push(invoiceData);
        totals.days_90_plus += amount;
      }

      totals.total += amount;
    });

    res.status(200).json({
      success: true,
      data: {
        // Arrays of invoices in each bucket
        current: agingData.current,
        days_30: agingData.days_30,
        days_60: agingData.days_60,
        days_90: agingData.days_90,
        days_90_plus: agingData.days_90_plus,
        // Summary totals
        summary: {
          current: totals.current,
          days_30: totals.days_30,
          days_60: totals.days_60,
          days_90: totals.days_90,
          days_90_plus: totals.days_90_plus,
          total: totals.total,
          totalInvoices: invoices.length,
          currentCount: agingData.current.length,
          overdueCount: agingData.days_30.length + agingData.days_60.length + agingData.days_90.length + agingData.days_90_plus.length
        }
      }
    });
  } catch (error) {
    console.error('Get aging report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate aging report',
      error: error.message
    });
  }
};

/**
 * Get vendor invoice statistics
 */
exports.getInvoiceStats = async (req, res) => {
  try {
    // Total invoices by status
    const invoicesByStatus = await VendorInvoice.findAll({
      where: { isActive: true },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'amount']
      ],
      group: ['status'],
      raw: true
    });

    // Total invoices by payment status
    const invoicesByPaymentStatus = await VendorInvoice.findAll({
      where: { isActive: true },
      attributes: [
        [sequelize.col('payment_status'), 'paymentStatus'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'amount']
      ],
      group: ['payment_status'],
      raw: true
    });

    // Monthly invoice trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await VendorInvoice.findAll({
      where: {
        isActive: true,
        invoice_date: { [Op.gte]: sixMonthsAgo }
      },
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('invoice_date'), '%Y-%m'), 'month'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'amount']
      ],
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('invoice_date'), '%Y-%m')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('invoice_date'), '%Y-%m'), 'ASC']],
      raw: true
    });

    // Calculate summary statistics from the arrays
    const totalInvoices = invoicesByPaymentStatus.reduce((sum, item) => sum + parseInt(item.count), 0);
    const totalAmount = invoicesByPaymentStatus.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    const unpaidData = invoicesByPaymentStatus.find(item => item.paymentStatus === 'unpaid') || { count: 0, amount: 0 };
    const overdueData = invoicesByPaymentStatus.find(item => item.paymentStatus === 'overdue') || { count: 0, amount: 0 };
    const paidData = invoicesByPaymentStatus.find(item => item.paymentStatus === 'paid') || { count: 0, amount: 0 };

    res.status(200).json({
      success: true,
      data: {
        // Summary values for cards
        totalInvoices,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        unpaidAmount: parseFloat(unpaidData.amount || 0),
        unpaidCount: parseInt(unpaidData.count || 0),
        overdueAmount: parseFloat(overdueData.amount || 0),
        overdueCount: parseInt(overdueData.count || 0),
        paidAmount: parseFloat(paidData.amount || 0),
        paidCount: parseInt(paidData.count || 0),
        // Detailed arrays
        invoicesByStatus,
        invoicesByPaymentStatus,
        monthlyTrends
      }
    });
  } catch (error) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice statistics',
      error: error.message
    });
  }
};

/**
 * Get vendor payment analysis report
 * Analyzes payment patterns, early payment discounts, and payment optimization
 * GET /api/finance/vendor-invoices/payment-analysis
 */
exports.getVendorPaymentAnalysis = async (req, res) => {
  try {
    const {
      startDate = '',
      endDate = '',
      vendorId = '',
      minAmount = 0
    } = req.query;

    // Build where clause
    const whereClause = {
      isActive: true,
      paymentStatus: 'paid'
    };

    if (startDate && endDate) {
      whereClause.paymentDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereClause.paymentDate = {
        [Op.gte]: new Date(startDate)
      };
    } else {
      // Default to last 12 months
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      whereClause.paymentDate = {
        [Op.gte]: twelveMonthsAgo
      };
    }

    if (vendorId) {
      whereClause.vendorId = vendorId;
    }

    if (minAmount > 0) {
      whereClause.totalAmount = {
        [Op.gte]: minAmount
      };
    }

    // Get all paid invoices
    const paidInvoices = await VendorInvoice.findAll({
      where: whereClause,
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'vendorName', 'paymentTerms', 'earlyPaymentDiscount']
        }
      ]
    });

    // Analyze by vendor
    const vendorAnalysis = {};

    paidInvoices.forEach(invoice => {
      const vendorIdKey = invoice.vendorId;
      
      if (!vendorAnalysis[vendorIdKey]) {
        vendorAnalysis[vendorIdKey] = {
          vendor_id: vendorIdKey,
          vendor_name: invoice.vendor?.vendorName || 'Unknown',
          payment_terms: invoice.vendor?.paymentTerms || 0,
          early_payment_discount: invoice.vendor?.earlyPaymentDiscount || 0,
          total_invoices: 0,
          total_amount_paid: 0,
          on_time_count: 0,
          early_count: 0,
          late_count: 0,
          payment_days: [],
          discount_opportunities: 0,
          discount_amount_missed: 0,
          discount_amount_taken: 0
        };
      }

      const stats = vendorAnalysis[vendorIdKey];
      stats.total_invoices++;
      stats.total_amount_paid += parseFloat(invoice.totalAmount || 0);

      // Calculate payment days
      if (invoice.dueDate && invoice.paymentDate) {
        const dueDate = new Date(invoice.dueDate);
        const paymentDate = new Date(invoice.paymentDate);
        const daysDiff = Math.round((paymentDate - dueDate) / (1000 * 60 * 60 * 24));
        
        stats.payment_days.push(daysDiff);

        if (daysDiff < 0) {
          stats.early_count++;
          
          // Check if early payment discount was available
          if (stats.early_payment_discount > 0 && Math.abs(daysDiff) >= 5) {
            stats.discount_opportunities++;
            const discountAmount = parseFloat(invoice.totalAmount) * (stats.early_payment_discount / 100);
            
            // Check if discount was applied
            if (invoice.discountAmount && invoice.discountAmount > 0) {
              stats.discount_amount_taken += parseFloat(invoice.discountAmount);
            } else {
              stats.discount_amount_missed += discountAmount;
            }
          }
        } else if (daysDiff === 0) {
          stats.on_time_count++;
        } else {
          stats.late_count++;
        }
      }
    });

    // Calculate averages and trends
    const vendorMetrics = Object.values(vendorAnalysis).map(stats => {
      const avgPaymentDays = stats.payment_days.length > 0
        ? stats.payment_days.reduce((sum, days) => sum + days, 0) / stats.payment_days.length
        : 0;

      const onTimePercentage = stats.total_invoices > 0
        ? (stats.on_time_count / stats.total_invoices) * 100
        : 0;

      const earlyPercentage = stats.total_invoices > 0
        ? (stats.early_count / stats.total_invoices) * 100
        : 0;

      const latePercentage = stats.total_invoices > 0
        ? (stats.late_count / stats.total_invoices) * 100
        : 0;

      // Determine payment trend
      let paymentTrend = 'stable';
      if (stats.payment_days.length >= 3) {
        const recentDays = stats.payment_days.slice(-3);
        const olderDays = stats.payment_days.slice(0, 3);
        const recentAvg = recentDays.reduce((sum, d) => sum + d, 0) / recentDays.length;
        const olderAvg = olderDays.reduce((sum, d) => sum + d, 0) / olderDays.length;
        
        if (recentAvg < olderAvg - 2) {
          paymentTrend = 'improving';
        } else if (recentAvg > olderAvg + 2) {
          paymentTrend = 'declining';
        }
      }

      return {
        vendor_id: stats.vendor_id,
        vendor_name: stats.vendor_name,
        payment_terms: stats.payment_terms,
        total_invoices: stats.total_invoices,
        total_amount_paid: Math.round(stats.total_amount_paid),
        avg_payment_days: Math.round(avgPaymentDays * 10) / 10,
        on_time_percentage: Math.round(onTimePercentage * 10) / 10,
        early_percentage: Math.round(earlyPercentage * 10) / 10,
        late_percentage: Math.round(latePercentage * 10) / 10,
        payment_trend: paymentTrend,
        discount_opportunities: stats.discount_opportunities,
        discount_amount_taken: Math.round(stats.discount_amount_taken),
        discount_amount_missed: Math.round(stats.discount_amount_missed),
        potential_savings: Math.round(stats.discount_amount_missed)
      };
    });

    // Sort by total amount paid (highest first)
    vendorMetrics.sort((a, b) => b.total_amount_paid - a.total_amount_paid);

    // Calculate overall metrics
    const totalSpent = vendorMetrics.reduce((sum, v) => sum + v.total_amount_paid, 0);
    const totalDiscountsTaken = vendorMetrics.reduce((sum, v) => sum + v.discount_amount_taken, 0);
    const totalDiscountsMissed = vendorMetrics.reduce((sum, v) => sum + v.discount_amount_missed, 0);
    const totalInvoices = vendorMetrics.reduce((sum, v) => sum + v.total_invoices, 0);
    
    const avgPaymentDaysAll = vendorMetrics.length > 0
      ? vendorMetrics.reduce((sum, v) => sum + (v.avg_payment_days * v.total_invoices), 0) / totalInvoices
      : 0;

    // Generate optimization recommendations
    const recommendations = [];

    if (totalDiscountsMissed > 1000) {
      recommendations.push({
        type: 'discount_opportunity',
        priority: 'high',
        message: `Potential savings of AED ${totalDiscountsMissed.toLocaleString()} available through early payment discounts`,
        action: 'Review vendors offering early payment discounts and prioritize their invoices'
      });
    }

    const latePayingVendors = vendorMetrics.filter(v => v.late_percentage > 20);
    if (latePayingVendors.length > 0) {
      recommendations.push({
        type: 'late_payment',
        priority: 'medium',
        message: `${latePayingVendors.length} vendor(s) with >20% late payments`,
        action: 'Review payment processes and consider negotiating better payment terms',
        vendors: latePayingVendors.map(v => v.vendor_name)
      });
    }

    const decliningTrends = vendorMetrics.filter(v => v.payment_trend === 'declining');
    if (decliningTrends.length > 0) {
      recommendations.push({
        type: 'declining_trend',
        priority: 'medium',
        message: `${decliningTrends.length} vendor(s) showing declining payment trends`,
        action: 'Investigate cash flow issues and improve payment scheduling',
        vendors: decliningTrends.map(v => v.vendor_name)
      });
    }

    // Payment timeline data for charting (using invoice_date since paymentDate doesn't exist)
    const paymentTimeline = await VendorInvoice.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('invoice_date'), '%Y-%m'), 'month'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'invoice_count'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_amount']
      ],
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('invoice_date'), '%Y-%m')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('invoice_date'), '%Y-%m'), 'ASC']],
      raw: true
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total_vendors: vendorMetrics.length,
          total_invoices: totalInvoices,
          total_spent: Math.round(totalSpent),
          avg_payment_days: Math.round(avgPaymentDaysAll * 10) / 10,
          total_discounts_taken: Math.round(totalDiscountsTaken),
          total_discounts_missed: Math.round(totalDiscountsMissed),
          potential_annual_savings: Math.round(totalDiscountsMissed)
        },
        vendor_breakdown: vendorMetrics,
        payment_timeline: paymentTimeline.map(row => ({
          month: row.month,
          invoice_count: parseInt(row.invoice_count),
          total_amount: Math.round(parseFloat(row.total_amount))
        })),
        recommendations
      }
    });
  } catch (error) {
    console.error('Get vendor payment analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate vendor payment analysis',
      error: error.message
    });
  }
};
