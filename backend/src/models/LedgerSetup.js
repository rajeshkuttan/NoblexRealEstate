const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LedgerSetup = sequelize.define('LedgerSetup', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'company_id',
    references: { model: 'company_settings', key: 'id' },
  },
  documentType: {
    type: DataTypes.ENUM('Purchase Invoice', 'Payment Voucher', 'Journal Voucher', 'Sales Invoice', 'Receipt', 'Others'),
    allowNull: false,
    field: 'document_type'
  },
  subDocument: {
    type: DataTypes.ENUM('Cash', 'Bank', 'PDC'),
    allowNull: true,
    field: 'sub_document'
  },
  calculationOn: {
    type: DataTypes.ENUM('Gross', 'Net', 'Others'),
    allowNull: false,
    field: 'calculation_on'
  },
  amountType: {
    type: DataTypes.ENUM('Dr', 'Cr', 'Others'),
    allowNull: false,
    field: 'amount_type'
  },
  postingType: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'posting_type',
    references: {
      model: 'chart_of_accounts',
      key: 'id'
    }
  }
}, {
  tableName: 'ledger_setups',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = LedgerSetup;
