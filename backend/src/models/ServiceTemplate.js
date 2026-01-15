const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ServiceTemplate = sequelize.define('ServiceTemplate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Service template name like Security Deposit, Agency Fee, etc.'
  },
  defaultAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'default_amount',
    comment: 'Default amount for this service'
  },
  isTaxable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_taxable',
    comment: 'Whether this service is subject to tax by default'
  },
  billingMethod: {
    type: DataTypes.ENUM('included_in_rental', 'charged_separately'),
    defaultValue: 'charged_separately',
    field: 'billing_method',
    comment: 'Default billing method for this service'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Optional description for the service template'
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Category like UAE Mandatory, Optional, Custom'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
    comment: 'Whether this template is active'
  },
  isSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_system',
    comment: 'System templates cannot be deleted'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sort_order',
    comment: 'Display order'
  }
}, {
  tableName: 'service_templates',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_category',
      fields: ['category']
    },
    {
      name: 'idx_active',
      fields: ['is_active']
    }
  ]
});

module.exports = ServiceTemplate;
