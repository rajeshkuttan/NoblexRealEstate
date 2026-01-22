const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const Item = sequelize.define('Item', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  itemCode: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'item_code',
    comment: 'Auto-generated: ITM-YYYY-XXXX'
  },
  itemName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'item_name',
    comment: 'Item name/description'
  },
  itemCategory: {
    type: DataTypes.ENUM('material', 'service', 'equipment', 'supplies', 'other'),
    allowNull: false,
    defaultValue: 'material',
    field: 'item_category',
    comment: 'Item category'
  },
  unitOfMeasure: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pcs',
    field: 'unit_of_measure',
    comment: 'Unit of measure (pcs, kg, m, box, set, etc.)'
  },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'account_id',
    comment: 'Foreign key to chart_of_accounts (expense/asset account)',
    references: {
      model: 'chart_of_accounts',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Item description'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
    comment: 'Active status'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'created_by',
    comment: 'User who created this item',
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
  tableName: 'items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_items_code',
      unique: true,
      fields: ['item_code']
    },
    {
      name: 'idx_items_account',
      fields: ['account_id']
    },
    {
      name: 'idx_items_category',
      fields: ['item_category']
    },
    {
      name: 'idx_items_active',
      fields: ['is_active']
    }
  ],
  comment: 'Item Master for Procurement Module'
});

module.exports = Item;
