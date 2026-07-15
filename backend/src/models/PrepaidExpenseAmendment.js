const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PrepaidExpenseAmendment = sequelize.define(
  'PrepaidExpenseAmendment',
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
    amendmentNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'amendment_number' },
    amendmentType: { type: DataTypes.STRING(40), allowNull: false, field: 'amendment_type' },
    requestedChangesJson: { type: DataTypes.JSON, allowNull: true, field: 'requested_changes_json' },
    reason: { type: DataTypes.TEXT, allowNull: true },
    effectiveDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'effective_date' },
    status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'DRAFT' },
    submittedBy: { type: DataTypes.INTEGER, allowNull: false, field: 'submitted_by' },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
  },
  {
    tableName: 'prepaid_expense_amendments',
    timestamps: true,
    underscored: true,
  }
);

module.exports = PrepaidExpenseAmendment;
