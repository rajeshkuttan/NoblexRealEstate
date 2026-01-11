const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Unit = sequelize.define('Unit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  unitNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'unit_number'
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'property_id',
    references: {
      model: 'properties',
      key: 'id'
    }
  },
  floor: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  bedrooms: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  bathrooms: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  area: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false
  },
  areaUnit: {
    type: DataTypes.ENUM('sqft', 'sqm'),
    defaultValue: 'sqft',
    field: 'area_unit'
  },
  type: {
    type: DataTypes.ENUM('apartment', 'villa', 'townhouse', 'studio', 'penthouse', 'duplex'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('available', 'occupied', 'maintenance', 'reserved'),
    defaultValue: 'available'
  },
  rentAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'rent_amount'
  },
  depositAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'deposit_amount'
  },
  utilities: {
    type: DataTypes.JSON,
    allowNull: true
  },
  amenities: {
    type: DataTypes.JSON,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true
  },
  floorPlan: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'floor_plan'
  },
  balcony: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  parking: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  furnished: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  petFriendly: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'pet_friendly'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'units',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Unit;
