const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Service = sequelize.define('Service', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Service name like Security Deposit, Agency Fee, etc.'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  isTaxable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_taxable',
    comment: 'Whether this service is subject to tax (e.g., UAE VAT)'
  },
  billingMethod: {
    type: DataTypes.ENUM('included_in_rental', 'charged_separately'),
    defaultValue: 'charged_separately',
    field: 'billing_method',
    comment: 'How this service is billed to the tenant'
  },
  entityType: {
    type: DataTypes.ENUM('unit', 'lease'),
    allowNull: false,
    field: 'entity_type',
    comment: 'Type of entity this service is attached to'
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'entity_id',
    comment: 'ID of the unit or lease this service belongs to'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Optional description for the service'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sort_order',
    comment: 'Order in which services should be displayed'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'services',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_entity',
      fields: ['entity_type', 'entity_id']
    },
    {
      name: 'idx_entity_type',
      fields: ['entity_type']
    },
    {
      name: 'idx_entity_id',
      fields: ['entity_id']
    }
  ]
});

module.exports = Service;
