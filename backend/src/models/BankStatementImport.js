const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const BankStatementImport = sequelize.define('BankStatementImport', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'company_id',
    references: { model: 'company_settings', key: 'id' },
  },
  bankAccountId: { type: DataTypes.INTEGER, allowNull: false, field: 'bank_account_id', references: { model: 'bank_accounts', key: 'id' } },
  fileName: { type: DataTypes.STRING(255), allowNull: false, field: 'file_name' },
  fileType: { type: DataTypes.ENUM('csv', 'xlsx', 'pdf', 'ofx', 'qif'), allowNull: false, field: 'file_type' },
  fileSize: { type: DataTypes.INTEGER, field: 'file_size' },
  statementPeriodStart: { type: DataTypes.DATE, field: 'statement_period_start' },
  statementPeriodEnd: { type: DataTypes.DATE, field: 'statement_period_end' },
  totalTransactions: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_transactions' },
  importedTransactions: { type: DataTypes.INTEGER, defaultValue: 0, field: 'imported_transactions' },
  duplicateTransactions: { type: DataTypes.INTEGER, defaultValue: 0, field: 'duplicate_transactions' },
  failedTransactions: { type: DataTypes.INTEGER, defaultValue: 0, field: 'failed_transactions' },
  status: { type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'partially_completed'), defaultValue: 'pending' },
  errorLog: { type: DataTypes.TEXT, allowNull: true, field: 'error_log' },
  importedBy: { type: DataTypes.INTEGER, allowNull: false, field: 'imported_by', references: { model: 'users', key: 'id' } },
  importedAt: { type: DataTypes.DATE, field: 'imported_at', defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
  processedAt: { type: DataTypes.DATE, allowNull: true, field: 'processed_at' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at', defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
  updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at', defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
}, {
  tableName: 'bank_statement_imports',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { name: 'idx_bank_statement_imports_account', fields: ['bank_account_id'] },
    { name: 'idx_bank_statement_imports_status', fields: ['status'] }
  ]
});

module.exports = BankStatementImport;
