const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LeaseRevenueReconciliation = sequelize.define(
  'LeaseRevenueReconciliation',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'company_id',
      references: { model: 'company_settings', key: 'id' },
    },
    scheduleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'schedule_id',
      references: { model: 'lease_revenue_schedules', key: 'id' },
    },
    reconciliationDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'reconciliation_date' },
    originalAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: false, field: 'original_amount' },
    recognizedAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0, field: 'recognized_amount' },
    remainingSubledgerBalance: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'remaining_subledger_balance',
    },
    deferredGlBalance: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'deferred_gl_balance',
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
    tableName: 'lease_revenue_reconciliations',
    timestamps: true,
    underscored: true,
  }
);

module.exports = LeaseRevenueReconciliation;
