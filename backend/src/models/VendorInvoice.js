const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const VendorInvoice = sequelize.define('VendorInvoice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  invoiceNumber: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'invoice_number',
    comment: 'Unique invoice number'
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
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'property_id',
    comment: 'Property this invoice relates to',
    references: {
      model: 'properties',
      key: 'id'
    }
  },
  invoiceDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'invoice_date',
    comment: 'Invoice issue date'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'due_date',
    comment: 'Payment due date'
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
    comment: 'VAT amount'
  },
  totalAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'total_amount',
    comment: 'Total amount including tax'
  },
  status: {
    type: DataTypes.ENUM('draft', 'pending_approval', 'approved', 'rejected', 'cancelled'),
    defaultValue: 'draft',
    comment: 'Invoice approval status'
  },
  paymentStatus: {
    type: DataTypes.ENUM('unpaid', 'partially_paid', 'paid', 'overdue'),
    defaultValue: 'unpaid',
    field: 'payment_status',
    comment: 'Payment status'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Invoice description/notes'
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Invoice document attachments'
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
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
    comment: 'Soft delete flag'
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
  tableName: 'vendor_invoices',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [],
  comment: 'Vendor invoices for accounts payable management'
});

module.exports = VendorInvoice;
