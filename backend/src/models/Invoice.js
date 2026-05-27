const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Invoice = sequelize.define('Invoice', {
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
  invoiceNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'invoice_number'
  },
  leaseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'lease_id',
    references: {
      model: 'leases',
      key: 'id'
    }
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'tenant_id',
    references: {
      model: 'tenants',
      key: 'id'
    }
  },
  invoiceDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'invoice_date'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'due_date'
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  taxRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    field: 'tax_rate'
  },
  taxAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'tax_amount'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_amount'
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'paid', 'overdue', 'cancelled'),
    defaultValue: 'draft'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  items: {
    type: DataTypes.JSON,
    allowNull: true
  },
  details: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sentDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'sent_date'
  },
  paidDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'paid_date'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  vendorInvoiceNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'vendor_invoice_number',
    comment: 'Vendor invoice reference (for reimbursements)'
  },
  purchaseOrderNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'purchase_order_number',
    comment: 'Purchase order reference'
  },
  isPosted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_posted'
  },
  postedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'posted_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  postedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'posted_at'
  },
  transactionNo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'transaction_no'
  }
}, {
  tableName: 'invoices',
  timestamps: true,
  indexes: [
    {
      name: 'idx_invoices_vendor_invoice',
      fields: ['vendor_invoice_number']
    },
    {
      name: 'idx_invoices_purchase_order',
      fields: ['purchase_order_number']
    },
    {
      name: 'idx_invoices_date',
      fields: ['invoice_date']
    },
    {
      name: 'idx_invoices_due',
      fields: ['due_date']
    },
    {
      name: 'idx_invoices_status',
      fields: ['status']
    },
    {
      name: 'idx_invoices_lease',
      fields: ['lease_id']
    },
    {
      name: 'idx_invoices_tenant',
      fields: ['tenant_id']
    }
  ],
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Invoice;
