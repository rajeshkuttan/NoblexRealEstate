const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const JournalVoucherDetail = sequelize.define('JournalVoucherDetail', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  jvId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'jv_id',
    references: {
      model: 'journal_vouchers',
      key: 'id'
    }
  },
  ledgerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'ledger_id',
    references: {
      model: 'chart_of_accounts',
      key: 'id'
    }
  },
  debitAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'debit_amount'
  },
  creditAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'credit_amount'
  }
}, {
  tableName: 'journal_voucher_details',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = JournalVoucherDetail;
