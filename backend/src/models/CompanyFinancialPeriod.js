const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CompanyFinancialPeriod = sequelize.define(
  'CompanyFinancialPeriod',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    financialYearId: { type: DataTypes.INTEGER, allowNull: false, field: 'financial_year_id' },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: 'company_id' },
    periodNo: { type: DataTypes.INTEGER, allowNull: false, field: 'period_no' },
    startDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'start_date' },
    endDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'end_date' },
    status: {
      type: DataTypes.ENUM('OPEN', 'SOFT_CLOSED', 'HARD_CLOSED'),
      allowNull: false,
      defaultValue: 'OPEN',
    },
    closedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'closed_by' },
    closedAt: { type: DataTypes.DATE, allowNull: true, field: 'closed_at' },
  },
  { tableName: 'company_financial_periods', timestamps: true, underscored: true }
);

module.exports = CompanyFinancialPeriod;
