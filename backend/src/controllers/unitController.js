const { Unit, Property, Lease, Ticket, Tenant } = require('../models');
const Service = require('../models/Service');
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');
const config = require('../config/config');
const {
  persistImagesArray,
  removeOrphanedUploads,
  deleteEntityUploadDir
} = require('../utils/saveEntityImages');
const {
  companyWhere,
  withCompanyId,
  assertRecordInCompany,
  assertParentsInCompany,
} = require('../utils/companyScope');

const mapUnitTypeForAnalytics = (type) => {
  const normalizedType = String(type || '').trim().toLowerCase();

  switch (normalizedType) {
    case 'studio':
    case 'penthouse':
    case 'duplex':
    case 'apartment':
      return 'Apartment';
    case 'townhouse':
    case 'villa':
      return 'Villa';
    case 'office':
      return 'Office';
    case 'retail':
      return 'Retail';
    case 'warehouse':
      return 'Warehouse';
    default:
      if (!normalizedType) return 'Other';
      return normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);
  }
};

const getAnalyticsStartDate = (timeRange) => {
  const now = new Date();

  switch (timeRange) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
};

// Get all units
const getAllUnits = async (req, res, next) => {
  try {
    const { search, status, type, propertyId, unitId, category, includeLease } = req.query;

    // Normalize pagination with max limit enforcement (higher limit for units as they're often needed in bulk)
    const { page, limit, offset } = normalizePagination(req.query, 10, 500);

    const whereClause = { ...companyWhere(req) };
    const needsLeaseForSearch = !!(search);
    if (search) {
      const searchPattern = `%${search}%`;
      whereClause[Op.or] = [
        { unitNumber: { [Op.like]: searchPattern } },
        { description: { [Op.like]: searchPattern } },
        { category: { [Op.like]: searchPattern } },
        { '$property.title$': { [Op.like]: searchPattern } },
        { '$property.location$': { [Op.like]: searchPattern } },
        { '$leases.tenant.name$': { [Op.like]: searchPattern } },
        { '$leases.tenant.email$': { [Op.like]: searchPattern } },
        { '$leases.tenant.phone$': { [Op.like]: searchPattern } }
      ];
    }
    if (status) whereClause.status = status;
    if (type) whereClause.type = type;
    if (category) whereClause.category = category;
    if (propertyId) whereClause.propertyId = propertyId;
    if (unitId) whereClause.id = unitId;

    // Build includes array - only include lease/tenant if explicitly requested (for performance)
    const includes = [
      {
        model: Property,
        as: 'property',
        attributes: ['id', 'title', 'location', 'buildingType'],
        required: false
      }
    ];

    // Include lease/tenant for search (flat JOIN without limit — required for $..$ where syntax)
    // or for display (with limit: 1 for performance)
    if (needsLeaseForSearch) {
      includes.push({
        model: Lease,
        as: 'leases',
        where: { status: { [Op.in]: ['active', 'Active'] } },
        required: false,
        attributes: ['id', 'leaseNumber', 'status', 'tenantId'],
        include: [
          {
            model: Tenant,
            as: 'tenant',
            attributes: ['id', 'name', 'email', 'phone'],
            required: false
          }
        ]
      });
    } else if (includeLease === 'true' || includeLease === true) {
      includes.push({
        model: Lease,
        as: 'leases',
        where: { status: { [Op.in]: ['active', 'Active'] } },
        required: false,
        limit: 1,
        order: [['created_at', 'DESC']],
        attributes: ['id', 'leaseNumber', 'status', 'tenantId'],
        include: [
          {
            model: Tenant,
            as: 'tenant',
            attributes: ['id', 'name', 'email', 'phone'],
            required: false
          }
        ]
      });
    }

    // Optimized query - use separate count query for better performance
    // Exclude images by default — can be loaded on demand
    const unitAttributes = [
      'id', 'unitNumber', 'type', 'status', 'area', 'bedrooms',
      'bathrooms', 'parking', 'furnished', 'rentAmount', 'depositAmount',
      'description', 'propertyId', 'category', 'created_at', 'updated_at'
    ];

    // Only include images if explicitly requested
    if (req.query.includeImages === 'true') {
      unitAttributes.push('images');
    }

    const [units, totalCount] = await Promise.all([
      Unit.findAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        attributes: unitAttributes,
        include: includes,
        subQuery: false // Better for simpler queries without complex joins
      }),
      Unit.count({
        where: whereClause,
        include: search ? [
          { model: Property, as: 'property' },
          {
            model: Lease,
            as: 'leases',
            where: { status: { [Op.in]: ['active', 'Active'] } },
            required: false,
            include: [{ model: Tenant, as: 'tenant', required: false }]
          }
        ] : [],
        distinct: true,
        col: 'id'
      })
    ]);

    res.json({
      success: true,
      data: {
        units: units,
        pagination: createPaginationMeta(totalCount, page, limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get unit by ID
const getUnitById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const unit = await assertRecordInCompany(Unit, id, req, {
      include: [
        {
          model: Property,
          as: 'property'
        },
        {
          model: Lease,
          as: 'leases',
          include: ['tenant']
        },
        {
          model: Ticket,
          as: 'tickets',
          limit: 10,
          order: [['created_at', 'DESC']]
        }
      ]
    });

    // Fetch associated services
    const services = await Service.findAll({
      where: {
        entityType: 'unit',
        entityId: id,
        isActive: true
      },
      order: [['sortOrder', 'ASC'], ['created_at', 'ASC']]
    });

    // Add services to unit data
    const unitData = unit.toJSON();
    unitData.services = services;

    res.json({
      success: true,
      data: unitData
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }
    next(error);
  }
};

/**
 * Bulk create units (single request; used by Excel import batches).
 * Per-row validation matches createUnit; partial success with per-row errors.
 */
const bulkImportUnits = async (req, res, next) => {
  const started = Date.now();
  try {
    const { units } = req.body;
    if (!Array.isArray(units) || units.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body must include a non-empty "units" array'
      });
    }

    const maxBatch = config.bulkImport.maxUnitsPerBatch;
    if (units.length > maxBatch) {
      return res.status(400).json({
        success: false,
        message: `Batch size exceeds server limit (${maxBatch}). Send smaller batches.`
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    /** Track units added in this request per property (for totalUnits limit) */
    const pendingInBatchByProperty = {};

    for (let i = 0; i < units.length; i++) {
      const raw = units[i];
      const { images: rowImages, ...unitFields } = raw || {};
      const unitData = { ...unitFields, images: null };
      const label = unitData?.unitNumber || `index ${i}`;

      try {
        if (!raw || !unitData.propertyId || !unitData.unitNumber) {
          throw new Error('Missing propertyId or unitNumber');
        }

        const existingUnit = await Unit.findOne({
          where: {
            unitNumber: unitData.unitNumber,
            propertyId: unitData.propertyId,
            ...companyWhere(req),
          },
        });

        if (existingUnit) {
          throw new Error('A unit with this number already exists in this property.');
        }

        await assertParentsInCompany(req, { propertyId: unitData.propertyId });
        const property = await Property.findOne({
          where: { id: unitData.propertyId, companyId: req.companyId },
        });
        if (property && property.totalUnits) {
          const currentUnitCount = await Unit.count({
            where: { propertyId: unitData.propertyId }
          });
          const pid = unitData.propertyId;
          const inBatch = pendingInBatchByProperty[pid] || 0;
          if (currentUnitCount + inBatch >= property.totalUnits) {
            throw new Error(
              `Cannot create unit. Property limit of ${property.totalUnits} units reached.`
            );
          }
        }

        const created = await Unit.create(withCompanyId(req, unitData));
        if (rowImages !== undefined && rowImages !== null) {
          const persisted = await persistImagesArray(
            Array.isArray(rowImages) ? rowImages : [],
            'unit',
            created.id
          );
          if (persisted) {
            await created.update({ images: persisted });
          }
        }
        results.success++;
        const pid = unitData.propertyId;
        pendingInBatchByProperty[pid] = (pendingInBatchByProperty[pid] || 0) + 1;
      } catch (err) {
        results.failed++;
        const msg = err.message || String(err);
        results.errors.push(`Unit ${label}: ${msg}`);
      }
    }

    const durationMs = Date.now() - started;
    console.log(
      `[bulkImportUnits] rows=${units.length} success=${results.success} failed=${results.failed} durationMs=${durationMs}`
    );

    res.json({
      success: true,
      data: {
        ...results,
        durationMs
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create new unit
const createUnit = async (req, res, next) => {
  try {
    const { images, ...unitRest } = req.body;
    const unitData = { ...unitRest, images: null };
    
    // 1. Check for Duplicate Unit Number in the same Property
    const existingUnit = await Unit.findOne({
      where: {
        unitNumber: unitData.unitNumber,
        propertyId: unitData.propertyId
      }
    });

    if (existingUnit) {
      return res.status(409).json({
        success: false,
        message: 'A unit with this number already exists in this property.'
      });
    }

    await assertParentsInCompany(req, { propertyId: unitData.propertyId });

    // 2. Check Property Unit Limit
    const property = await Property.findOne({
      where: { id: unitData.propertyId, companyId: req.companyId },
    });
    if (property && property.totalUnits) { // Only check if property exists and limit is set
      const currentUnitCount = await Unit.count({
        where: { propertyId: unitData.propertyId }
      });

      if (currentUnitCount >= property.totalUnits) {
        return res.status(400).json({
          success: false,
          message: `Cannot create unit. Property limit of ${property.totalUnits} units reached.`
        });
      }
    }

    const unit = await Unit.create(withCompanyId(req, unitData));

    if (images !== undefined && images !== null) {
      const persisted = await persistImagesArray(
        Array.isArray(images) ? images : [],
        'unit',
        unit.id
      );
      if (persisted) {
        await unit.update({ images: persisted });
      }
    }

    const unitOut = await Unit.findByPk(unit.id);

    res.status(201).json({
      success: true,
      message: 'Unit created successfully',
      data: unitOut
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// Update unit
const updateUnit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { images, ...updateData } = req.body;

    const unit = await assertRecordInCompany(Unit, id, req);

    // Check for Duplicate Unit Number (if unitNumber is being updated)
    if (updateData.unitNumber && updateData.unitNumber !== unit.unitNumber) {
        const existingUnit = await Unit.findOne({
            where: {
                unitNumber: updateData.unitNumber,
                propertyId: unit.propertyId, // Assume property doesn't change usually, or updateData.propertyId if provided
                id: { [Op.ne]: id } // Exclude self
            }
        });

        if (existingUnit) {
            return res.status(409).json({
                success: false,
                message: 'A unit with this number already exists in this property.'
            });
        }
    }

    const oldImages = unit.images;

    await unit.update(updateData);

    if (images !== undefined) {
      const persisted = await persistImagesArray(
        Array.isArray(images) ? images : [],
        'unit',
        unit.id
      );
      await removeOrphanedUploads(oldImages, persisted, 'unit', unit.id);
      await unit.update({ images: persisted });
    }

    const unitOut = await Unit.findByPk(unit.id);

    res.json({
      success: true,
      message: 'Unit updated successfully',
      data: unitOut
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }
    next(error);
  }
};

// Delete unit
const deleteUnit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const unit = await assertRecordInCompany(Unit, id, req);

    await unit.destroy();

    await deleteEntityUploadDir('unit', id);

    res.json({
      success: true,
      message: 'Unit deleted successfully'
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: 'Unit not found' });
    }
    next(error);
  }
};

// Get unit statistics
const getUnitStats = async (req, res, next) => {
  try {
    const { propertyId, timeRange } = req.query;
    const whereClause = { ...companyWhere(req) };
    if (propertyId && propertyId !== 'All') {
      whereClause.propertyId = propertyId;
    }
    const analyticsStartDate = getAnalyticsStartDate(timeRange);
    if (analyticsStartDate) {
      whereClause.created_at = { [Op.gte]: analyticsStartDate };
    }

    // 1. Fetch units with minimal required fields for calculation
    const units = await Unit.findAll({
      where: whereClause,
      attributes: ['id', 'unitNumber', 'type', 'status', 'rentAmount', 'area', 'propertyId', 'roi', 'tenantSatisfaction'],
      include: [
        {
          model: Property,
          as: 'property', // Assuming association is aliased as 'property'
          attributes: ['id', 'title']
        },
        {
           model: Lease,
           as: 'leases',
           attributes: ['id', 'status'],
           where: { status: 'active' },
           required: false // LEFT JOIN so we get all units
        }
      ]
    });

    const totalUnits = units.length;
    
    // 2. Calculate actual status based on active lease existence
    // This overrides the 'status' column if it is out of sync
    const unitsWithCorrectStatus = units.map(u => {
        const hasActiveLease = u.leases && u.leases.length > 0;
        const currentStatus = (u.status || '').toLowerCase();
        const isDisputed = ['dispute', 'npa', 'case'].includes(currentStatus);
        
        let realStatus;
        if (isDisputed) {
            // [FIX] Dispute status takes precedence for KPI tracking
            realStatus = currentStatus;
        } else if (hasActiveLease) {
            realStatus = 'occupied';
        } else {
            // Preserve non-leasable / explicit statuses (inactive, reserved, maintenance, etc.)
            if (
              currentStatus === 'maintenance' ||
              currentStatus === 'renovation' ||
              currentStatus === 'under maintenance' ||
              currentStatus === 'inactive' ||
              currentStatus === 'reserved'
            ) {
                realStatus = currentStatus;
            } else {
                realStatus = 'available';
            }
        }
        
        // Return a lightweight object for aggregation
        return {
            ...u.toJSON(), // safely clone
            realStatus: realStatus
        };
    });

    // 3. Aggregate Counts
    const statusCounts = unitsWithCorrectStatus.reduce((acc, unit) => {
      const status = unit.realStatus;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const occupiedCount = statusCounts['occupied'] || 0;
    const availableCount = statusCounts['available'] || 0;
    const maintenanceCount = (statusCounts['maintenance'] || 0) + (statusCounts['under maintenance'] || 0) + (statusCounts['renovation'] || 0);
    const disputeCount = (statusCounts['dispute'] || 0) + (statusCounts['npa'] || 0) + (statusCounts['case'] || 0);

    // 4. Calculate financial metrics
    // Use the CORRECTED list
    const occupiedUnits = unitsWithCorrectStatus.filter(u => u.realStatus === 'occupied');
    const totalRevenue = occupiedUnits.reduce((sum, unit) => sum + (parseFloat(unit.rentAmount) || 0), 0);
    const averageRent = occupiedCount > 0 ? totalRevenue / occupiedCount : 0;
    const occupancyRate = totalUnits > 0 ? (occupiedCount / totalUnits) * 100 : 0;
    
    // Average Area
    const validAreaUnits = units.filter(u => u.area > 0);
    const totalArea = validAreaUnits.reduce((sum, u) => sum + parseFloat(u.area), 0);
    const avgArea = validAreaUnits.length > 0 ? totalArea / validAreaUnits.length : 0;

    // Average ROI (placeholder)
    const avgROI = 0; 
    const avgTenantSatisfaction = 0; 

    // 5. Type Distribution
    const typeDistribution = units.reduce((acc, unit) => {
      const type = mapUnitTypeForAnalytics(unit.type);
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // 6. Property Performance
    const propertyPerf = {};
    unitsWithCorrectStatus.forEach(unit => {
      if (unit.realStatus === 'occupied' && unit.property) {
        const propName = unit.property.title || 'Unknown Property';
        if (!propertyPerf[propName]) {
          propertyPerf[propName] = { revenue: 0, units: 0 };
        }
        propertyPerf[propName].revenue += (parseFloat(unit.rentAmount) || 0);
        propertyPerf[propName].units += 1;
      }
    });

    // 6. Top Performing Units (by rent amount)
    const topUnits = occupiedUnits
      .sort((a, b) => (parseFloat(b.rentAmount) || 0) - (parseFloat(a.rentAmount) || 0))
      .slice(0, 5)
      .map(u => ({
        id: u.id,
        unitNumber: u.unitNumber,
        propertyName: u.property?.title || 'N/A',
        type: u.type,
        area: u.area,
        monthlyRent: u.rentAmount,
        roi: 0 
      }));

    res.json({
      success: true,
      data: {
        summary: {
          total: totalUnits,
          occupied: occupiedCount,
          available: availableCount,
          maintenance: maintenanceCount,
          dispute: disputeCount,
          occupancyRate,
          totalRevenue,
          averageRent,
          avgArea: Math.round(avgArea),
          avgROI,
          avgTenantSatisfaction
        },
        typeDistribution,
        propertyPerformance: propertyPerf,
        topUnits,
        filters: {
          timeRange: timeRange || 'all'
        }
      } // Data structure matching new frontend expectation
    });
  } catch (error) {
    next(error);
  }
};

const getPropertyOptions = async (req, res, next) => {
  try {
    const properties = await Property.findAll({
      where: companyWhere(req),
      attributes: ['id', 'title', 'location'],
      order: [['title', 'ASC']]
    });
    res.json({ success: true, data: { properties } });
  } catch (error) {
    next(error);
  }
};

const getUnitOptions = async (req, res, next) => {
  try {
    const where = { ...companyWhere(req) };
    if (req.query.propertyId) where.propertyId = req.query.propertyId;
    const units = await Unit.findAll({
      where,
      attributes: ['id', 'unitNumber', 'propertyId'],
      order: [['unitNumber', 'ASC']]
    });
    res.json({ success: true, data: { units } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUnits,
  getUnitById,
  bulkImportUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  getUnitStats,
  getPropertyOptions,
  getUnitOptions
};
