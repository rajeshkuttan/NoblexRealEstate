const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PaymentInvoiceAllocation = sequelize.define(
  'PaymentInvoiceAllocation',
  {
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
    paymentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'payment_id',
      references: {
        model: 'payments',
        key: 'id'
      }
    },
    invoiceKind: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'invoice_kind',
      comment: 'tenant | vendor | purchase | direct_purchase'
    },
    invoiceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'invoice_id',
      comment: 'PK of invoices, vendor_invoices, or purchase_invoices depending on kind'
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    }
  },
  {
    tableName: 'payment_invoice_allocations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['payment_id'] },
      { fields: ['invoice_kind', 'invoice_id'] }
    ]
  }
);

module.exports = PaymentInvoiceAllocation;
