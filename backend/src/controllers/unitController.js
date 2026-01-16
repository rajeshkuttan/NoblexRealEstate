const { Unit, Property, Lease, Ticket, Tenant } = require('../models');
const Service = require('../models/Service');
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');

// Get all units
const getAllUnits = async (req, res, next) => {
  try {
    const { search, status, type, propertyId, includeLease } = req.query;
    
    // Normalize pagination with max limit enforcement (higher limit for units as they're often needed in bulk)
    const { page, limit, offset } = normalizePagination(req.query, 10, 500);

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { unitNumber: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (type) whereClause.type = type;
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
      'bathrooms', 'furnished', 'rentAmount', 'depositAmount', 
      'description', 'propertyId', 'created_at', 'updated_at'
    ];
    
    // Only include images if explicitly requested (they're large)
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
        where: whereClause
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
    const totalUnits = await Unit.count();
    const availableUnits = await Unit.count({ where: { status: 'available' } });
    const occupiedUnits = await Unit.count({ where: { status: 'occupied' } });
    const maintenanceUnits = await Unit.count({ where: { status: 'maintenance' } });

    res.json({
      success: true,
      data: {
        total: totalUnits,
        available: availableUnits,
        occupied: occupiedUnits,
        maintenance: maintenanceUnits
      }
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
