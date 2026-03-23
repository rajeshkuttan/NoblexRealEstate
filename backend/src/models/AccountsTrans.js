const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AccountsTrans = sequelize.define('AccountsTrans', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transactionNo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    field: 'transaction_no'
  },
  transactionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'transaction_date'
  },
  jvNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'jv_number'
  },
  crDr: {
    type: DataTypes.ENUM('Cr', 'Dr'),
    allowNull: false,
    field: 'cr_dr'
  },
  particular: {
    type: DataTypes.STRING(255),
    allowNull: true
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
  },
  billId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'bill_id',
    references: {
      model: 'vendor_invoices',
      key: 'id'
    }
  },
  narration: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  jvId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'jv_id',
    references: {
      model: 'journal_vouchers',
      key: 'id'
    }
  },
  paymentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'payment_id',
    references: {
      model: 'payments',
      key: 'id'
    }
  },
  invoiceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'invoice_id',
    references: {
      model: 'invoices',
      key: 'id'
    }
  }
}, {
  tableName: 'accounts_trans',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = AccountsTrans;
