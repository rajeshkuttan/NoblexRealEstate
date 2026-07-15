const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PrepaidExpenseAllocation = sequelize.define(
  'PrepaidExpenseAllocation',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'company_id',
      references: { model: 'company_settings', key: 'id' },
    },
    prepaidExpenseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'prepaid_expense_id',
      references: { model: 'prepaid_expenses', key: 'id' },
    },
    allocationType: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'CUSTOM',
      field: 'allocation_type',
    },
    propertyId: { type: DataTypes.INTEGER, allowNull: true, field: 'property_id' },
    unitId: { type: DataTypes.INTEGER, allowNull: true, field: 'unit_id' },
    projectId: { type: DataTypes.INTEGER, allowNull: true, field: 'project_id' },
    departmentId: { type: DataTypes.INTEGER, allowNull: true, field: 'department_id' },
    costCenterId: { type: DataTypes.INTEGER, allowNull: true, field: 'cost_center_id' },
    allocationPercentage: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: false,
      defaultValue: 0,
      field: 'allocation_percentage',
    },
    allocationAmount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'allocation_amount',
    },
    expenseAccountId: { type: DataTypes.INTEGER, allowNull: true, field: 'expense_account_id' },
    description: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    tableName: 'prepaid_expense_allocations',
    timestamps: true,
    underscored: true,
  }
);

module.exports = PrepaidExpenseAllocation;
