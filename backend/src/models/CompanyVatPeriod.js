const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CompanyVatPeriod = sequelize.define(
  'CompanyVatPeriod',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: 'company_id' },
    periodName: { type: DataTypes.STRING(100), allowNull: false, field: 'period_name' },
    startDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'start_date' },
    endDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'end_date' },
    status: {
      type: DataTypes.ENUM('OPEN', 'LOCKED', 'SUBMITTED'),
      allowNull: false,
      defaultValue: 'OPEN',
    },
    submittedAt: { type: DataTypes.DATE, allowNull: true, field: 'submitted_at' },
    submittedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'submitted_by' },
  },
  { tableName: 'company_vat_periods', timestamps: true, underscored: true }
);

module.exports = CompanyVatPeriod;
