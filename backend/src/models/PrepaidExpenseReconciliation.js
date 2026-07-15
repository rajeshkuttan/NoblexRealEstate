const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PrepaidExpenseReconciliation = sequelize.define(
  'PrepaidExpenseReconciliation',
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
    reconciliationDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'reconciliation_date' },
    originalAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: false, field: 'original_amount' },
    recognizedAmount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'recognized_amount',
    },
    remainingSubledgerBalance: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'remaining_subledger_balance',
    },
    prepaidGlBalance: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'prepaid_gl_balance',
    },
    differenceAmount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'difference_amount',
    },
    status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'EXCEPTION' },
    exceptionReason: { type: DataTypes.TEXT, allowNull: true, field: 'exception_reason' },
    resolvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'resolved_by' },
    resolvedAt: { type: DataTypes.DATE, allowNull: true, field: 'resolved_at' },
  },
  {
    tableName: 'prepaid_expense_reconciliations',
    timestamps: true,
    underscored: true,
  }
);

module.exports = PrepaidExpenseReconciliation;
