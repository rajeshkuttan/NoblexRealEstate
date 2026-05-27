const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CompanyOpeningBalanceBatch = sequelize.define(
  'CompanyOpeningBalanceBatch',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: 'company_id' },
    batchName: { type: DataTypes.STRING(100), allowNull: false, field: 'batch_name' },
    balanceDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'balance_date' },
    status: {
      type: DataTypes.ENUM('draft', 'posted', 'locked'),
      allowNull: false,
      defaultValue: 'draft',
    },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
  },
  { tableName: 'company_opening_balance_batches', timestamps: true, underscored: true }
);

module.exports = CompanyOpeningBalanceBatch;
