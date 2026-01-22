/**
 * Vendor Controller
 * Handles vendor/supplier management operations
 * Part of: Phase 3.1 - Vendor/AP APIs
 */

const { Vendor, VendorInvoice, FinancialTransaction, User, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all vendors with filters and pagination
 */
exports.getAllVendors = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      sortBy = 'createdAt',
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
        { vendorName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { trn: { [Op.like]: `%${search}%` } },
        { contactPerson: { [Op.like]: `%${search}%` } }
      ];
    }

    // Status filter
    if (status) {
      whereClause.status = status;
    }

    // Get vendors with associations
    const { count, rows: vendors } = await Vendor.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: VendorInvoice,
          as: 'invoices',
          attributes: ['id', 'invoiceNumber', 'totalAmount', 'paymentStatus']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      distinct: true
    });

    // Calculate statistics for each vendor
    const vendorsWithStats = await Promise.all(
      vendors.map(async (vendor) => {
        const vendorData = vendor.toJSON();

        // Get invoice statistics using proper aggregation
        try {
          const invoiceStatsResult = await VendorInvoice.findAll({
            where: { vendorId: vendor.id, isActive: true },
            attributes: [
              [sequelize.fn('COUNT', sequelize.col('id')), 'totalInvoices'],
              [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('total_amount')), 0), 'totalAmount'],
              [sequelize.fn('COALESCE', 
                sequelize.fn('SUM', 
                  sequelize.literal(`CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END`)
                ), 0
              ), 'paidAmount'],
              [sequelize.fn('COALESCE', 
                sequelize.fn('SUM', 
                  sequelize.literal(`CASE WHEN payment_status = 'unpaid' THEN total_amount ELSE 0 END`)
                ), 0
              ), 'unpaidAmount']
            ],
            raw: true
          });

          const stats = invoiceStatsResult && invoiceStatsResult.length > 0 ? invoiceStatsResult[0] : {
            totalInvoices: '0',
            totalAmount: '0',
            paidAmount: '0',
            unpaidAmount: '0'
          };

          return {
            ...vendorData,
            statistics: {
              totalInvoices: parseInt(stats.totalInvoices || 0),
              totalAmount: parseFloat(stats.totalAmount || 0),
              paidAmount: parseFloat(stats.paidAmount || 0),
              unpaidAmount: parseFloat(stats.unpaidAmount || 0)
            }
          };
        } catch (statsError) {
          console.error(`Error calculating stats for vendor ${vendor.id}:`, statsError);
          // Return vendor without stats if calculation fails
          return {
            ...vendorData,
            statistics: {
              totalInvoices: 0,
              totalAmount: 0,
              paidAmount: 0,
              unpaidAmount: 0
            }
          };
        }
      })
    );

    res.status(200).json({
      success: true,
      data: {
        vendors: vendorsWithStats,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendors',
      error: error.message
    });
  }
};

/**
 * Get vendor by ID with detailed information
 */
exports.getVendorById = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await Vendor.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: VendorInvoice,
          as: 'invoices',
          where: { isActive: true },
          required: false,
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'name', 'email']
            }
          ]
        },
        {
          model: FinancialTransaction,
          as: 'transactions',
          where: { isActive: true },
          required: false,
          limit: 10,
          order: [['transactionDate', 'DESC']]
        }
      ]
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Calculate vendor statistics
    const invoiceStats = await VendorInvoice.findOne({
      where: { vendorId: id, isActive: true },
      attributes: [
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalInvoices'],
        [require('sequelize').fn('SUM', require('sequelize').col('totalAmount')), 'totalAmount'],
        [require('sequelize').fn('SUM', 
          require('sequelize').literal(`CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END`)
        ), 'paidAmount'],
        [require('sequelize').fn('SUM', 
          require('sequelize').literal(`CASE WHEN payment_status = 'unpaid' THEN total_amount ELSE 0 END`)
        ), 'unpaidAmount'],
        [require('sequelize').fn('SUM', 
          require('sequelize').literal(`CASE WHEN payment_status = 'overdue' THEN total_amount ELSE 0 END`)
        ), 'overdueAmount']
      ],
      raw: true
    });

    const vendorData = vendor.toJSON();

    res.status(200).json({
      success: true,
      data: {
        ...vendorData,
        statistics: {
          totalInvoices: parseInt(invoiceStats?.totalInvoices || 0),
          totalAmount: parseFloat(invoiceStats?.totalAmount || 0),
          paidAmount: parseFloat(invoiceStats?.paidAmount || 0),
          unpaidAmount: parseFloat(invoiceStats?.unpaidAmount || 0),
          overdueAmount: parseFloat(invoiceStats?.overdueAmount || 0)
        }
      }
    });
  } catch (error) {
    console.error('Get vendor by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor',
      error: error.message
    });
  }
};

/**
 * Create new vendor
 */
exports.createVendor = async (req, res) => {
  try {
    const {
      vendorName,
      contactPerson,
      email,
      phone,
      address,
      trn,
      paymentTerms,
      bankDetails,
      status,
      notes
    } = req.body;

    // Check for duplicate email
    const existingVendor = await Vendor.findOne({
      where: { email, isActive: true }
    });

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: 'Vendor with this email already exists'
      });
    }

    // Check for duplicate TRN if provided
    if (trn) {
      const existingTRN = await Vendor.findOne({
        where: { trn, isActive: true }
      });

      if (existingTRN) {
        return res.status(400).json({
          success: false,
          message: 'Vendor with this TRN already exists'
        });
      }
    }

    // Create vendor
    const vendor = await Vendor.create({
      vendorName,
      contactPerson,
      email,
      phone,
      address,
      trn,
      paymentTerms: paymentTerms || 'Net 30',
      bankDetails,
      status: status || 'active',
      notes,
      createdBy: req.user.id
    });

    // Fetch created vendor with associations
    const createdVendor = await Vendor.findByPk(vendor.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      data: createdVendor
    });
  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vendor',
      error: error.message
    });
  }
};

/**
 * Update vendor
 */
exports.updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vendorName,
      contactPerson,
      email,
      phone,
      address,
      trn,
      paymentTerms,
      bankDetails,
      status,
      notes
    } = req.body;

    // Find vendor
    const vendor = await Vendor.findOne({
      where: { id, isActive: true }
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Check for duplicate email (excluding current vendor)
    if (email && email !== vendor.email) {
      const existingVendor = await Vendor.findOne({
        where: { 
          email, 
          isActive: true,
          id: { [Op.ne]: id }
        }
      });

      if (existingVendor) {
        return res.status(400).json({
          success: false,
          message: 'Vendor with this email already exists'
        });
      }
    }

    // Check for duplicate TRN (excluding current vendor)
    if (trn && trn !== vendor.trn) {
      const existingTRN = await Vendor.findOne({
        where: { 
          trn, 
          isActive: true,
          id: { [Op.ne]: id }
        }
      });

      if (existingTRN) {
        return res.status(400).json({
          success: false,
          message: 'Vendor with this TRN already exists'
        });
      }
    }

    // Update vendor
    await vendor.update({
      vendorName: vendorName || vendor.vendorName,
      contactPerson: contactPerson !== undefined ? contactPerson : vendor.contactPerson,
      email: email || vendor.email,
      phone: phone !== undefined ? phone : vendor.phone,
      address: address !== undefined ? address : vendor.address,
      trn: trn !== undefined ? trn : vendor.trn,
      paymentTerms: paymentTerms !== undefined ? paymentTerms : vendor.paymentTerms,
      bankDetails: bankDetails !== undefined ? bankDetails : vendor.bankDetails,
      status: status || vendor.status,
      notes: notes !== undefined ? notes : vendor.notes
    });

    // Fetch updated vendor with associations
    const updatedVendor = await Vendor.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Vendor updated successfully',
      data: updatedVendor
    });
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vendor',
      error: error.message
    });
  }
};

/**
 * Delete vendor (soft delete)
 */
exports.deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;

    // Find vendor
    const vendor = await Vendor.findOne({
      where: { id, isActive: true }
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Check if vendor has active invoices
    const activeInvoices = await VendorInvoice.count({
      where: {
        vendorId: id,
        isActive: true,
        paymentStatus: { [Op.in]: ['unpaid', 'partially_paid'] }
      }
    });

    if (activeInvoices > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete vendor with ${activeInvoices} active invoice(s). Please settle all invoices first.`
      });
    }

    // Soft delete
    await vendor.update({ isActive: false });

    res.status(200).json({
      success: true,
      message: 'Vendor deleted successfully'
    });
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vendor',
      error: error.message
    });
  }
};

/**
 * Get vendor statistics
 */
exports.getVendorStats = async (req, res) => {
  try {
    // Total vendors by status
    const vendorsByStatus = await Vendor.findAll({
      where: { isActive: true },
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Total vendors
    const totalVendors = await Vendor.count({
      where: { isActive: true }
    });

    // Total invoices and amounts
    const invoiceStats = await VendorInvoice.findOne({
      where: { isActive: true },
      attributes: [
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalInvoices'],
        [require('sequelize').fn('SUM', require('sequelize').col('total_amount')), 'totalAmount'],
        [require('sequelize').fn('SUM', 
          require('sequelize').literal(`CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END`)
        ), 'paidAmount'],
        [require('sequelize').fn('SUM', 
          require('sequelize').literal(`CASE WHEN payment_status = 'unpaid' THEN total_amount ELSE 0 END`)
        ), 'unpaidAmount'],
        [require('sequelize').fn('SUM', 
          require('sequelize').literal(`CASE WHEN payment_status = 'overdue' THEN total_amount ELSE 0 END`)
        ), 'overdueAmount']
      ],
      raw: true
    });

    // Top vendors by invoice amount - use raw query to avoid Sequelize complexity
    const { sequelize } = require('../config/database');
    const [topVendors] = await sequelize.query(`
      SELECT 
        v.id,
        v.vendor_name as vendorName,
        SUM(vi.total_amount) as totalAmount
      FROM vendors v
      INNER JOIN vendor_invoices vi ON v.id = vi.vendor_id
      WHERE v.is_active = true AND vi.is_active = true
      GROUP BY v.id, v.vendor_name
      ORDER BY totalAmount DESC
      LIMIT 10
    `);

    res.status(200).json({
      success: true,
      data: {
        totalVendors,
        vendorsByStatus: vendorsByStatus.reduce((acc, curr) => {
          acc[curr.status] = parseInt(curr.count);
          return acc;
        }, {}),
        invoiceStatistics: {
          totalInvoices: parseInt(invoiceStats?.totalInvoices || 0),
          totalAmount: parseFloat(invoiceStats?.totalAmount || 0),
          paidAmount: parseFloat(invoiceStats?.paidAmount || 0),
          unpaidAmount: parseFloat(invoiceStats?.unpaidAmount || 0),
          overdueAmount: parseFloat(invoiceStats?.overdueAmount || 0)
        },
        topVendors: topVendors.map(v => ({
          id: v.id,
          vendorName: v.vendorName,
          totalAmount: parseFloat(v.totalAmount || 0)
        }))
      }
    });
  } catch (error) {
    console.error('Get vendor stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vendor statistics',
      error: error.message
    });
  }
};

