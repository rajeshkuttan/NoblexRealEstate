const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const PurchaseOrder = sequelize.define('PurchaseOrder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  poNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'po_number',
    comment: 'Auto-generated: PO-YYYY-XXXX'
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
  poDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'po_date',
    comment: 'Purchase order date'
  },
  expectedDeliveryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'expected_delivery_date',
    comment: 'Expected delivery date'
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'acknowledged', 'partially_received', 'fully_received', 'cancelled'),
    defaultValue: 'draft',
    comment: 'PO status'
  },
  lineItems: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    field: 'line_items',
    comment: 'Line items: [{"item_id": 1, "quantity": 10, "unit_price": 100, "total": 1000}]'
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
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes'
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'property_id',
    comment: 'Optional property association',
    references: {
      model: 'properties',
      key: 'id'
    }
  },
  unitId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'unit_id',
    comment: 'Optional unit association',
    references: {
      model: 'units',
      key: 'id'
    }
  },
  leaseId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'lease_id',
    comment: 'Optional lease association',
    references: {
      model: 'leases',
      key: 'id'
    }
  },
  workOrderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'work_order_id',
    comment: 'Optional work order/maintenance request association'
  },
  deliveryAddress: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'delivery_address',
    comment: 'Delivery address details'
  },
  deliveryContactName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'delivery_contact_name',
    comment: 'Contact person name for delivery'
  },
  deliveryContactPhone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'delivery_contact_phone',
    comment: 'Contact phone number for delivery'
  },
  deliveryInstructions: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'delivery_instructions',
    comment: 'Special delivery instructions'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'created_by',
    comment: 'User who created this PO',
    references: {
      model: 'users',
      key: 'id'
    }
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
  tableName: 'purchase_orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_po_number',
      unique: true,
      fields: ['po_number']
    },
    {
      name: 'idx_po_vendor',
      fields: ['vendor_id']
    },
    {
      name: 'idx_po_status',
      fields: ['status']
    },
    {
      name: 'idx_po_date',
      fields: ['po_date']
    },
    {
      name: 'idx_po_property',
      fields: ['property_id']
    },
    {
      name: 'idx_po_unit',
      fields: ['unit_id']
    },
    {
      name: 'idx_po_lease',
      fields: ['lease_id']
    }
  ],
  comment: 'Purchase Orders for Procurement Module'
});

module.exports = PurchaseOrder;
