const { Tenant, Lease, Payment, Invoice, Ticket } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const tenantAnalyticsService = require('../services/tenantAnalyticsService');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const overdueInvoiceTenantSubquery = `(SELECT DISTINCT tenant_id FROM invoices WHERE tenant_id IS NOT NULL AND (status = 'overdue' OR (status = 'sent' AND due_date < CURDATE())))`;

/** First non-empty Excel cell from candidate header keys */
function pickCell(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return String(row[k]).trim();
    }
  }
  return null;
}

/** UAE FTA TRN: exactly 15 digits, or null if empty */
function normalizeVatTrnForImport(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length !== 15) {
    throw new Error('VATRegNo must be exactly 15 digits (UAE FTA)');
  }
  return digits;
}

// Get all tenants
const getAllTenants = async (req, res, next) => {
  try {
    const { search, status, emirate, paymentStatus, kycStatus } = req.query;
    const statusNorm = status ? String(status).toLowerCase().trim() : '';
    const paymentNorm = paymentStatus ? String(paymentStatus).toLowerCase().trim() : '';
    const kycNorm = kycStatus ? String(kycStatus).toLowerCase().trim() : '';

    // Normalize pagination with max limit enforcement
    const { page, limit, offset } = normalizePagination(req.query, 10, 100);

    const andConditions = [];

    if (search && String(search).trim()) {
      const term = String(search).trim().slice(0, 200);
      const like = `%${term}%`;
      const esc = sequelize.escape(like);
      andConditions.push({
        [Op.or]: [
          { name: { [Op.like]: like } },
          { email: { [Op.like]: like } },
          { phone: { [Op.like]: like } },
          {
            id: {
              [Op.in]: sequelize.literal(
                `(SELECT DISTINCT l.tenant_id FROM leases l
                  INNER JOIN units u ON u.id = l.unit_id
                  INNER JOIN properties p ON p.id = u.property_id
                  WHERE l.tenant_id IS NOT NULL
                  AND (u.unit_number LIKE ${esc} OR p.title LIKE ${esc}))`
              )
            }
          }
        ]
      });
    }

    if (emirate) {
      const em = String(emirate).toLowerCase().trim().replace(/\s+/g, '_');
      andConditions.push({ emirate: em });
    }

    if (statusNorm && ['active', 'inactive', 'suspended', 'terminated'].includes(statusNorm)) {
      andConditions.push({ status: statusNorm });
    } else if (statusNorm === 'overdue') {
      andConditions.push({
        id: { [Op.in]: sequelize.literal(overdueInvoiceTenantSubquery) }
      });
    }

    if (paymentNorm === 'overdue') {
      andConditions.push({
        id: { [Op.in]: sequelize.literal(overdueInvoiceTenantSubquery) }
      });
    } else if (paymentNorm === 'current') {
      andConditions.push({
        id: { [Op.notIn]: sequelize.literal(overdueInvoiceTenantSubquery) }
      });
    } else if (paymentNorm === 'partial') {
      andConditions.push({
        id: {
          [Op.in]: sequelize.literal(
            `(SELECT p.tenant_id FROM payments p WHERE p.tenant_id IS NOT NULL GROUP BY p.tenant_id
              HAVING SUM(CASE WHEN p.status = 'paid' THEN 1 ELSE 0 END) > 0
              AND SUM(CASE WHEN p.status IN ('pending','overdue') THEN 1 ELSE 0 END) > 0)`
          )
        }
      });
    }

    const kycExpr =
      "LOWER(TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(documents, '$.kycStatus')), JSON_UNQUOTE(JSON_EXTRACT(documents, '$.kyc_status')), '')))";
    if (kycNorm === 'verified') {
      andConditions.push(sequelize.literal(`(${kycExpr} IN ('verified', 'completed'))`));
    } else if (kycNorm === 'pending') {
      andConditions.push(
        sequelize.literal(`(documents IS NULL OR ${kycExpr} IN ('', 'pending'))`)
      );
    } else if (kycNorm === 'rejected') {
      andConditions.push(sequelize.literal(`(${kycExpr} = 'rejected')`));
    }

    const leaseInclude = {
      model: Lease,
      as: 'leases',
      required: statusNorm === 'expiring',
      include: ['unit']
    };

    if (statusNorm === 'expiring') {
      const today = new Date().toISOString().slice(0, 10);
      const until = new Date();
      until.setDate(until.getDate() + 90);
      const untilStr = until.toISOString().slice(0, 10);
      leaseInclude.where = {
        status: 'active',
        endDate: { [Op.between]: [today, untilStr] }
      };
    }

    const whereClause = andConditions.length ? { [Op.and]: andConditions } : {};

    const tenants = await Tenant.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      distinct: true,
      include: [leaseInclude]
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

    const tenantData = tenants.map(t => ({
      'Name': t.name,
      'Email': t.email,
      'Phone': t.phone,
      'Emirates ID': t.emiratesId || '',
      'Nationality': t.nationality || '',
      'Company': t.company || '',
      'Status': t.status || 'active',
      'Account Code': t.accountCode || '',
      'Street': t.address || '',
      'Building No': t.buildingNo || '',
      'PO Box': t.poBox || '',
      'City': t.city || '',
      'Telephone': t.telephone || '',
      'Fax': t.fax || '',
      'VATRegNo': t.vatRegNo || ''
    }));

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
        const emiratesIdRaw = pickCell(row, 'Emirates ID', 'EmiratesId', 'emiratesId', 'EmiratesID') || '';

        // Basic validation
        if (!row.Name || !row.Email || !row.Phone) {
          throw new Error('Missing required fields: Name, Email, or Phone');
        }

        const vatRaw = pickCell(row, 'VATRegNo', 'VAT Reg No', 'VAT TRN', 'vatRegNo', 'vat_reg_no');
        let vatRegNo = null;
        if (vatRaw) {
          vatRegNo = normalizeVatTrnForImport(vatRaw);
        }

        // Check if tenant exists
        const existingTenant = await Tenant.findOne({ where: { email: String(row.Email).trim() } });

        const statusVal = pickCell(row, 'Status', 'status') || 'active';

        const tenantData = {
          name: String(row.Name).trim(),
          email: String(row.Email).trim(),
          phone: String(row.Phone).trim(),
          emiratesId: emiratesIdRaw ? String(emiratesIdRaw).trim() : null,
          nationality: pickCell(row, 'Nationality', 'nationality'),
          company: pickCell(row, 'Company', 'company'),
          status: statusVal,
          accountCode: pickCell(row, 'Account Code', 'AccountCode', 'account_code'),
          address: pickCell(row, 'Street', 'street', 'Address', 'address'),
          buildingNo: pickCell(row, 'Building No', 'BuildingNo', 'building_no'),
          poBox: pickCell(row, 'PO Box', 'POBox', 'po_box'),
          city: pickCell(row, 'City', 'city'),
          telephone: pickCell(row, 'Telephone', 'telephone', 'Landline'),
          fax: pickCell(row, 'Fax', 'fax'),
          vatRegNo
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

const getTenantOptions = async (req, res, next) => {
  try {
    const tenants = await Tenant.findAll({
      attributes: ['id', 'name', 'email'],
      order: [['name', 'ASC']],
    });
    res.json({ success: true, data: { tenants } });
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
  importTenants,
  getTenantOptions,
};
