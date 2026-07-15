const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LeaseRevenuePostingBatch = sequelize.define(
  'LeaseRevenuePostingBatch',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'company_id',
      references: { model: 'company_settings', key: 'id' },
    },
    batchNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'batch_number' },
    postingDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'posting_date' },
    fiscalPeriodId: { type: DataTypes.INTEGER, allowNull: true, field: 'fiscal_period_id' },
    postingMode: { type: DataTypes.STRING(40), allowNull: false, field: 'posting_mode' },
    lineCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'line_count' },
    totalAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0, field: 'total_amount' },
    status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'DRAFT' },
    startedAt: { type: DataTypes.DATE, allowNull: true, field: 'started_at' },
    completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
    createdBy: { type: DataTypes.INTEGER, allowNull: false, field: 'created_by' },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
    errorSummary: { type: DataTypes.TEXT, allowNull: true, field: 'error_summary' },
  },
  {
    tableName: 'lease_revenue_posting_batches',
    timestamps: true,
    underscored: true,
  }
);

module.exports = LeaseRevenuePostingBatch;
