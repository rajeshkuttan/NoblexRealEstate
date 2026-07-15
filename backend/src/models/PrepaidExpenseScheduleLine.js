const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PrepaidExpenseScheduleLine = sequelize.define(
  'PrepaidExpenseScheduleLine',
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
    lineNumber: { type: DataTypes.INTEGER, allowNull: false, field: 'line_number' },
    fiscalYear: { type: DataTypes.INTEGER, allowNull: true, field: 'fiscal_year' },
    fiscalPeriodId: { type: DataTypes.INTEGER, allowNull: true, field: 'fiscal_period_id' },
    recognitionMonth: { type: DataTypes.STRING(7), allowNull: false, field: 'recognition_month' },
    periodStartDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'period_start_date' },
    periodEndDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'period_end_date' },
    serviceDays: { type: DataTypes.INTEGER, allowNull: false, field: 'service_days' },
    dailyRate: { type: DataTypes.DECIMAL(18, 6), allowNull: false, field: 'daily_rate' },
    scheduledAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: false, field: 'scheduled_amount' },
    baseScheduledAmount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'base_scheduled_amount',
    },
    cumulativeRecognizedAmount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'cumulative_recognized_amount',
    },
    remainingBalanceAfterLine: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'remaining_balance_after_line',
    },
    recognitionDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'recognition_date' },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'due_date' },
    journalVoucherId: { type: DataTypes.INTEGER, allowNull: true, field: 'journal_voucher_id' },
    journalVoucherNumber: { type: DataTypes.STRING(50), allowNull: true, field: 'journal_voucher_number' },
    postingBatchId: { type: DataTypes.INTEGER, allowNull: true, field: 'posting_batch_id' },
    postingStatus: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'SCHEDULED',
      field: 'posting_status',
    },
    approvalStatus: { type: DataTypes.STRING(40), allowNull: true, field: 'approval_status' },
    postedAt: { type: DataTypes.DATE, allowNull: true, field: 'posted_at' },
    postedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'posted_by' },
    failureCode: { type: DataTypes.STRING(50), allowNull: true, field: 'failure_code' },
    failureReason: { type: DataTypes.TEXT, allowNull: true, field: 'failure_reason' },
    reversalJournalVoucherId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'reversal_journal_voucher_id',
    },
    reversedAt: { type: DataTypes.DATE, allowNull: true, field: 'reversed_at' },
    reversalReason: { type: DataTypes.TEXT, allowNull: true, field: 'reversal_reason' },
    isFinalAdjustment: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_final_adjustment',
    },
    isLocked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_locked' },
  },
  {
    tableName: 'prepaid_expense_schedule_lines',
    timestamps: true,
    underscored: true,
  }
);

module.exports = PrepaidExpenseScheduleLine;
