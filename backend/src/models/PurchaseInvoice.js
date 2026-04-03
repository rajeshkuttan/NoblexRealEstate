const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const PurchaseInvoice = sequelize.define('PurchaseInvoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  invoiceNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'invoice_number',
    comment: 'Auto-generated: PI-YYYY-XXXX'
  },
  vendorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'vendor_id',
    comment: 'Foreign key to vendors table',
    references: {
      model: 'vendors',
      key: 'id'
    }
  },
  purchaseOrderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'purchase_order_id',
    comment: 'Foreign key to purchase_orders table (optional)',
    references: {
      model: 'purchase_orders',
      key: 'id'
    }
  },
  goodsReceiptId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'goods_receipt_id',
    comment: 'Foreign key to goods_receipts table (optional)',
    references: {
      model: 'goods_receipts',
      key: 'id'
    }
  },
  goodsReceiptIds: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    field: 'goods_receipt_ids',
    comment: 'List of Goods Receipt IDs associated with this invoice'
  },
  invoiceDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'invoice_date',
    comment: 'Invoice date'
  },
  supplierInvoiceNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'supplier_invoice_number',
    comment: 'Invoice number from supplier/vendor'
  },
  supplierInvoiceDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'supplier_invoice_date',
    comment: 'Invoice date from supplier/vendor'
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'due_date',
    comment: 'Payment due date'
  },
  lineItems: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    field: 'line_items',
    comment: 'Line items: [{"item_id": 1, "quantity": 10, "unit_price": 100, "total": 1000, "account_id": 5}]'
  },
  subtotal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Subtotal before tax'
  },
  taxAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'tax_amount',
    comment: 'Tax amount (VAT)'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'total_amount',
    comment: 'Total amount including tax'
  },
  discountType: {
    type: DataTypes.ENUM('percentage', 'amount'),
    defaultValue: 'amount',
    field: 'discount_type',
    comment: 'Type of global discount'
  },
  discountValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'discount_value',
    comment: 'Value of global discount'
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending_approval', 'approved', 'paid', 'cancelled'),
    defaultValue: 'draft',
    comment: 'Invoice status'
  },
  paymentStatus: {
    type: DataTypes.ENUM('unpaid', 'partially_paid', 'paid'),
    defaultValue: 'unpaid',
    field: 'payment_status',
    comment: 'Payment status'
  },
  isPosted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_posted',
    comment: 'Indicates if the invoice has been posted to ledgers'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'created_by',
    comment: 'User who created this invoice',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'approved_by',
    comment: 'User who approved this invoice',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at',
    comment: 'Approval timestamp'
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'property_id',
    references: { model: 'properties', key: 'id' }
  },
  unitId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'unit_id',
    references: { model: 'units', key: 'id' }
  },
  leaseId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'lease_id',
    references: { model: 'leases', key: 'id' }
  },
  workOrderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'work_order_id',
    comment: 'Optional: Link to a work order for maintenance/projects'
  },
  deliveryAddress: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'delivery_address',
    comment: 'Specific delivery address for the invoice'
  },
  deliveryContactName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'delivery_contact_name',
    comment: 'Contact person for delivery'
  },
  deliveryContactPhone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'delivery_contact_phone',
    comment: 'Contact phone for delivery'
  },
  deliveryInstructions: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'delivery_instructions',
    comment: 'Special delivery instructions'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'created_at',
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'updated_at',
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
  }
}, {
  tableName: 'purchase_invoices',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_pi_number',
      unique: true,
      fields: ['invoice_number']
    },
    {
      name: 'idx_pi_vendor',
      fields: ['vendor_id']
    },
    {
      name: 'idx_pi_po',
      fields: ['purchase_order_id']
    },
    {
      name: 'idx_pi_gr',
      fields: ['goods_receipt_id']
    },
    {
      name: 'idx_pi_status',
      fields: ['status']
    },
    {
      name: 'idx_pi_payment_status',
      fields: ['payment_status']
    },
    {
      name: 'idx_pi_date',
      fields: ['invoice_date']
    }
  ],
  comment: 'Purchase Invoices for Procurement Module'
});

module.exports = PurchaseInvoice;
