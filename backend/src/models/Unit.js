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
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Unit category like Studio, 1BR, 2BR, etc.'
  },
  status: {
    type: DataTypes.ENUM('available', 'occupied', 'maintenance', 'reserved', 'dispute', 'npa', 'case', 'inactive'),
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
  marketValue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    field: 'market_value',
    comment: 'Estimated market value of the unit'
  },
  utilities: {
    type: DataTypes.JSON,
    allowNull: true
  },
  features: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of features like Dishwasher, AC, etc.'
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
    type: DataTypes.INTEGER,
    defaultValue: 0
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
  orientation: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Unit orientation like North, South, East, West'
  },
  energyRating: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'energy_rating',
    comment: 'Energy efficiency rating like A+, A, B, C'
  },
  lastRenovation: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'last_renovation',
    comment: 'Year or date of last renovation'
  },
  specialNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'special_notes',
    comment: 'Special notes or remarks for the unit'
  },
  virtualTour: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'virtual_tour',
    comment: 'Whether unit has virtual tour available'
  },
  smokingAllowed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'smoking_allowed',
    comment: 'Whether smoking is allowed in the unit'
  },
  documents: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of document types associated with the unit'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  roi: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    comment: 'Return on Investment percentage'
  },
  tenantSatisfaction: {
    type: DataTypes.DECIMAL(3, 1),
    allowNull: true,
    defaultValue: 0,
    field: 'tenant_satisfaction',
    comment: 'Tenant satisfaction rating (0-5)'
  }
}, {
  tableName: 'units',
  timestamps: true,
  indexes: [
    {
      name: 'idx_units_number',
      fields: ['unit_number']
    },
    {
      name: 'idx_units_property',
      fields: ['property_id']
    },
    {
      name: 'idx_units_status',
      fields: ['status']
    },
    {
      name: 'idx_units_active',
      fields: ['is_active']
    }
  ],
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Unit;
