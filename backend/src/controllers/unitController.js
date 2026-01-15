const { Unit, Property, Lease, Ticket } = require('../models');
const Service = require('../models/Service');
const { Op } = require('sequelize');

// Get all units
const getAllUnits = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status, type, propertyId } = req.query;
    const offset = (page - 1) * limit;

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

    const units = await Unit.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Property,
          as: 'property'
        },
        {
          model: Lease,
          as: 'leases',
          where: { status: 'active' },
          required: false
        }
      ]
    });

    res.json({
      success: true,
      data: {
        units: units.rows,
        pagination: {
          total: units.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(units.count / limit)
        }
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
