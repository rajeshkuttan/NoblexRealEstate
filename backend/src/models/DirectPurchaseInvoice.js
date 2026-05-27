const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DirectPurchaseInvoice = sequelize.define(
  'DirectPurchaseInvoice',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'company_id',
      references: { model: 'company_settings', key: 'id' },
    },
    dpiNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'dpi_number' },
    vendorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'vendor_id',
      references: { model: 'vendors', key: 'id' },
    },
    invoiceDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'invoice_date' },
    dueDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'due_date' },
    supplierInvoiceNo: { type: DataTypes.STRING(100), allowNull: true, field: 'supplier_invoice_no' },
    supplierInvoiceDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'supplier_invoice_date' },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'AED' },
    exchangeRate: { type: DataTypes.DECIMAL(15, 6), allowNull: false, defaultValue: 1, field: 'exchange_rate' },
    subtotalAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'subtotal_amount' },
    taxAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'tax_amount' },
    totalAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'total_amount' },
    paidAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'paid_amount' },
    outstandingAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'outstanding_amount',
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'POSTED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    description: { type: DataTypes.TEXT, allowNull: true },
    payableAccountId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'payable_account_id',
      references: { model: 'chart_of_accounts', key: 'id' },
    },
    transactionNo: { type: DataTypes.INTEGER, allowNull: true, field: 'transaction_no' },
    createdBy: { type: DataTypes.INTEGER, allowNull: false, field: 'created_by' },
    postedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'posted_by' },
    postedAt: { type: DataTypes.DATE, allowNull: true, field: 'posted_at' },
    cancelledBy: { type: DataTypes.INTEGER, allowNull: true, field: 'cancelled_by' },
    cancelledAt: { type: DataTypes.DATE, allowNull: true, field: 'cancelled_at' },
  },
  {
    tableName: 'direct_purchase_invoices',
    timestamps: true,
    underscored: true,
  }
);

module.exports = DirectPurchaseInvoice;
