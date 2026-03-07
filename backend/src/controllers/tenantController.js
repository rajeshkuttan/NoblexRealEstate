const { Tenant, Lease, Payment, Invoice, Ticket } = require('../models');
const { Op } = require('sequelize');
const tenantAnalyticsService = require('../services/tenantAnalyticsService');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Get all tenants
const getAllTenants = async (req, res, next) => {
  try {
    const { search, status, emirate } = req.query;
    
    // Normalize pagination with max limit enforcement
    const { page, limit, offset } = normalizePagination(req.query, 10, 100);

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (emirate) whereClause.emirate = emirate;

    const tenants = await Tenant.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      distinct: true,
      include: [
        {
          model: Lease,
          as: 'leases',
          include: ['unit']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        tenants: tenants.rows,
        pagination: createPaginationMeta(tenants.count, page, limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get tenant by ID
const getTenantById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findByPk(id, {
      include: [
        {
          model: Lease,
          as: 'leases',
          include: ['unit']
        },
        {
          model: Payment,
          as: 'payments',
          limit: 10,
          order: [['created_at', 'DESC']]
        },
        {
          model: Invoice,
          as: 'invoices',
          limit: 10,
          order: [['created_at', 'DESC']]
        },
        {
          model: Ticket,
          as: 'tickets',
          limit: 10,
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    res.json({
      success: true,
      data: tenant
    });
  } catch (error) {
    next(error);
  }
};

// Create new tenant
const createTenant = async (req, res, next) => {
  try {
    const tenantData = req.body;
    const tenant = await Tenant.create(tenantData);

    res.status(201).json({
      success: true,
      message: 'Tenant created successfully',
      data: tenant
    });
  } catch (error) {
    next(error);
  }
};

// Update tenant
const updateTenant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const tenant = await Tenant.findByPk(id);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    await tenant.update(updateData);

    res.json({
      success: true,
      message: 'Tenant updated successfully',
      data: tenant
    });
  } catch (error) {
    next(error);
  }
};

// Delete tenant
const deleteTenant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findByPk(id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    await tenant.destroy();

    res.json({
      success: true,
      message: 'Tenant deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get tenant statistics
const getTenantStats = async (req, res, next) => {
  try {
    const totalTenants = await Tenant.count();
    const activeTenants = await Tenant.count({ where: { status: 'active' } });
    const inactiveTenants = await Tenant.count({ where: { status: 'inactive' } });
    const suspendedTenants = await Tenant.count({ where: { status: 'suspended' } });

    res.json({
      success: true,
      data: {
        total: totalTenants,
        active: activeTenants,
        inactive: inactiveTenants,
        suspended: suspendedTenants
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get tenant payment behavior analysis
const getTenantPaymentBehavior = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const analysis = await tenantAnalyticsService.analyzeTenantPaymentBehavior(id);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    next(error);
  }
};

// Get tenant renewal evaluation
const getTenantRenewalEvaluation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { leaseId } = req.query;
    
    if (!leaseId) {
      return res.status(400).json({
        success: false,
        message: 'leaseId query parameter is required'
      });
    }
    
    const evaluation = await tenantAnalyticsService.evaluateTenantRenewal(id, leaseId);
    
    res.json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    next(error);
  }
};

// Export tenants to Excel
const exportTenants = async (req, res, next) => {
  try {
    const tenants = await Tenant.findAll({
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Lease,
          as: 'leases',
          include: ['unit']
        }
      ]
    });

    const tenantData = tenants.map(t => {
      // Return only fields that match the import template for consistency
      return {
        'Name': t.name,
        'Email': t.email,
        'Phone': t.phone,
        'Nationality': t.nationality || '',
        'Company': t.company || '',
        'Status': t.status || 'active'
      };
    });

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(tenantData);
    xlsx.utils.book_append_sheet(wb, ws, "Tenants");

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=tenants.xlsx');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// Import tenants from Excel
const importTenants = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty'
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const row of data) {
      try {
        const emiratesId = row['Emirates ID'] || row.EmiratesId || row.emiratesId || '';

        // Basic validation
        if (!row.Name || !row.Email || !row.Phone) {
          throw new Error('Missing required fields: Name, Email, or Phone');
        }

        // Check if tenant exists
        const existingTenant = await Tenant.findOne({ where: { email: row.Email } });
        
        const tenantData = {
          name: String(row.Name).trim(),
          email: String(row.Email).trim(),
          phone: String(row.Phone).trim(),
          emiratesId: emiratesId ? String(emiratesId).trim() : null,
          nationality: row.Nationality ? String(row.Nationality).trim() : null,
          company: row.Company ? String(row.Company).trim() : null,
          status: row.Status || 'active'
        };

        if (existingTenant) {
          await existingTenant.update(tenantData);
        } else {
          await Tenant.create(tenantData);
        }
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${row.Name || 'Unknown'}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `Import completed. Success: ${results.success}, Failed: ${results.failed}`,
      data: results
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
  getTenantStats,
  getTenantPaymentBehavior,
  getTenantRenewalEvaluation,
  exportTenants,
  importTenants
};
