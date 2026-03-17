const { Unit, Property, Lease, Ticket, Tenant } = require('../models');
const Service = require('../models/Service');
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');

// Get all units
const getAllUnits = async (req, res, next) => {
  try {
    const { search, status, type, propertyId, category, includeLease } = req.query;

    // Normalize pagination with max limit enforcement (higher limit for units as they're often needed in bulk)
    const { page, limit, offset } = normalizePagination(req.query, 10, 500);

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { unitNumber: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { '$property.title$': { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (type) whereClause.type = type;
    if (category) whereClause.category = category;
    if (propertyId) whereClause.propertyId = propertyId;

    // Build includes array - only include lease/tenant if explicitly requested (for performance)
    const includes = [
      {
        model: Property,
        as: 'property',
        attributes: ['id', 'title', 'location', 'buildingType'],
        required: false
      }
    ];

    // Only include lease/tenant if explicitly requested (slower query)
    if (includeLease === 'true' || includeLease === true) {
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
    // Exclude images by default (they're large base64 strings) - can be loaded on demand
    const unitAttributes = [
      'id', 'unitNumber', 'type', 'status', 'area', 'bedrooms',
      'bathrooms', 'parking', 'furnished', 'rentAmount', 'depositAmount',
      'description', 'propertyId', 'created_at', 'updated_at'
    ];

    // Only include images if explicitly requested (they're large base64 strings)
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
        include: search ? [{ model: Property, as: 'property' }] : [],
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
    const unit = await Unit.findByPk(id, {
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

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

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
    next(error);
  }
};

// Create new unit
const createUnit = async (req, res, next) => {
  try {
    const unitData = req.body;
    
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

    // 2. Check Property Unit Limit
    const property = await Property.findByPk(unitData.propertyId);
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

    const unit = await Unit.create(unitData);

    res.status(201).json({
      success: true,
      message: 'Unit created successfully',
      data: unit
    });
  } catch (error) {
    next(error);
  }
};

// Update unit
const updateUnit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const unit = await Unit.findByPk(id);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

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

    await unit.update(updateData);

    res.json({
      success: true,
      message: 'Unit updated successfully',
      data: unit
    });
  } catch (error) {
    next(error);
  }
};

// Delete unit
const deleteUnit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const unit = await Unit.findByPk(id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

    await unit.destroy();

    res.json({
      success: true,
      message: 'Unit deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get unit statistics
const getUnitStats = async (req, res, next) => {
  try {
    const { propertyId } = req.query;
    const whereClause = {};
    if (propertyId && propertyId !== 'All') {
      whereClause.propertyId = propertyId;
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
        // If lease exists, force 'Occupied'. If not, force 'Available' (unless it is maintenance which we might want to respect?)
        // Assuming 'maintenance' is a manual override we should respect if NO lease.
        // But if there IS a lease, it must be Occupied.
        
        let realStatus;
        if (hasActiveLease) {
            realStatus = 'occupied';
        } else {
            // Keep existing status if it is Maintenance/Renovation, otherwise Available
            const currentStatus = (u.status || '').toLowerCase();
            if (currentStatus === 'maintenance' || currentStatus === 'renovation' || currentStatus === 'under maintenance') {
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
      const type = unit.type || 'Other';
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
          occupancyRate,
          totalRevenue,
          averageRent,
          avgArea: Math.round(avgArea),
          avgROI,
          avgTenantSatisfaction
        },
        typeDistribution,
        propertyPerformance: propertyPerf,
        topUnits
      } // Data structure matching new frontend expectation
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
  getUnitStats
};
