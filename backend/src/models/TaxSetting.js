const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TaxSetting = sequelize.define('TaxSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  taxName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'tax_name'
  },
  taxType: {
    type: DataTypes.ENUM('vat', 'income_tax', 'property_tax', 'service_tax', 'other'),
    allowNull: false,
    field: 'tax_type'
  },
  taxRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    field: 'tax_rate'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  effectiveDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'effective_date'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_date'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  taxNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'tax_number'
  },
  registrationNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'registration_number'
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_default'
  }
}, {
  tableName: 'tax_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = TaxSetting;
