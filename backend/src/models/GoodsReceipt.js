const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const GoodsReceipt = sequelize.define('GoodsReceipt', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  grNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'gr_number',
    comment: 'Auto-generated: GR-YYYY-XXXX'
  },
  purchaseOrderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'purchase_order_id',
    comment: 'Foreign key to purchase_orders table',
    references: {
      model: 'purchase_orders',
      key: 'id'
    }
  },
  receiptDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'receipt_date',
    comment: 'Goods receipt date'
  },
  receivedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'received_by',
    comment: 'User who received the goods',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('draft', 'completed', 'cancelled'),
    defaultValue: 'draft',
    comment: 'GR status'
  },
  lineItems: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    field: 'line_items',
    comment: 'Line items: [{"item_id": 1, "ordered_qty": 10, "received_qty": 10, "unit_price": 100}]'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes'
  },
  deliveryPropertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'delivery_property_id',
    comment: 'Actual delivery property',
    references: {
      model: 'properties',
      key: 'id'
    }
  },
  deliveryUnitId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'delivery_unit_id',
    comment: 'Actual delivery unit',
    references: {
      model: 'units',
      key: 'id'
    }
  },
  deliveryAddress: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'delivery_address',
    comment: 'Full delivery address'
  },
  deliveryContactName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'delivery_contact_name',
    comment: 'Person who received the goods'
  },
  deliveryContactPhone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'delivery_contact_phone',
    comment: 'Contact phone number'
  },
  deliveryNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'delivery_notes',
    comment: 'Delivery-specific notes'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'created_by',
    comment: 'User who created this GR',
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
  tableName: 'goods_receipts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_gr_number',
      unique: true,
      fields: ['gr_number']
    },
    {
      name: 'idx_gr_po',
      fields: ['purchase_order_id']
    },
    {
      name: 'idx_gr_status',
      fields: ['status']
    },
    {
      name: 'idx_gr_date',
      fields: ['receipt_date']
    },
    {
      name: 'idx_gr_delivery_property',
      fields: ['delivery_property_id']
    },
    {
      name: 'idx_gr_delivery_unit',
      fields: ['delivery_unit_id']
    }
  ],
  comment: 'Goods Receipts for Procurement Module'
});

module.exports = GoodsReceipt;
