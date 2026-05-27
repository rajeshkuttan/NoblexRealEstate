const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DirectPurchaseInvoiceLine = sequelize.define(
  'DirectPurchaseInvoiceLine',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    directPurchaseInvoiceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'direct_purchase_invoice_id',
      references: { model: 'direct_purchase_invoices', key: 'id' },
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'company_id',
      references: { model: 'company_settings', key: 'id' },
    },
    expenseAccountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'expense_account_id',
      references: { model: 'chart_of_accounts', key: 'id' },
    },
    description: { type: DataTypes.STRING(500), allowNull: true },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    taxCode: { type: DataTypes.STRING(40), allowNull: true, field: 'tax_code' },
    taxRate: { type: DataTypes.DECIMAL(8, 4), allowNull: false, defaultValue: 0, field: 'tax_rate' },
    taxAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'tax_amount' },
    totalAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'total_amount' },
    inputTaxAccountId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'input_tax_account_id',
      references: { model: 'chart_of_accounts', key: 'id' },
    },
    costCenterId: { type: DataTypes.INTEGER, allowNull: true, field: 'cost_center_id' },
    propertyId: { type: DataTypes.INTEGER, allowNull: true, field: 'property_id' },
    unitId: { type: DataTypes.INTEGER, allowNull: true, field: 'unit_id' },
    leaseId: { type: DataTypes.INTEGER, allowNull: true, field: 'lease_id' },
  },
  {
    tableName: 'direct_purchase_invoice_lines',
    timestamps: true,
    underscored: true,
  }
);

module.exports = DirectPurchaseInvoiceLine;
