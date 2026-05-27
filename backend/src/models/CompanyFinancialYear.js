const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CompanyFinancialYear = sequelize.define(
  'CompanyFinancialYear',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: 'company_id' },
    yearName: { type: DataTypes.STRING(50), allowNull: false, field: 'year_name' },
    startDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'start_date' },
    endDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'end_date' },
    isCurrent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_current' },
    isClosed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_closed' },
  },
  { tableName: 'company_financial_years', timestamps: true, underscored: true }
);

module.exports = CompanyFinancialYear;
