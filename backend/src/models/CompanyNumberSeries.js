const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CompanyNumberSeries = sequelize.define(
  'CompanyNumberSeries',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: 'company_id' },
    documentType: { type: DataTypes.STRING(50), allowNull: false, field: 'document_type' },
    prefix: { type: DataTypes.STRING(20), allowNull: true },
    suffix: { type: DataTypes.STRING(20), allowNull: true },
    currentNumber: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'current_number' },
    padding: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 4 },
    resetType: {
      type: DataTypes.ENUM('never', 'daily', 'monthly', 'yearly'),
      allowNull: false,
      defaultValue: 'yearly',
      field: 'reset_type',
    },
    lastResetKey: { type: DataTypes.STRING(20), allowNull: true, field: 'last_reset_key' },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  },
  {
    tableName: 'company_number_series',
    timestamps: true,
    underscored: true,
  }
);

module.exports = CompanyNumberSeries;
