const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LeaseRevenueAdjustment = sequelize.define(
  'LeaseRevenueAdjustment',
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
    adjustmentNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'adjustment_number' },
    adjustmentType: { type: DataTypes.STRING(40), allowNull: false, field: 'adjustment_type' },
    effectiveDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'effective_date' },
    amount: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
    reason: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'DRAFT' },
    requestedChangesJson: { type: DataTypes.JSON, allowNull: true, field: 'requested_changes_json' },
    submittedBy: { type: DataTypes.INTEGER, allowNull: false, field: 'submitted_by' },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
  },
  {
    tableName: 'lease_revenue_adjustments',
    timestamps: true,
    underscored: true,
  }
);

module.exports = LeaseRevenueAdjustment;
