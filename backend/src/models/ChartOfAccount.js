const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChartOfAccount = sequelize.define('ChartOfAccount', {
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
  accountCode: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'account_code'
  },
  accountName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'account_name'
  },
  accountType: {
    type: DataTypes.ENUM('asset', 'liability', 'equity', 'revenue', 'expense'),
    allowNull: false,
    field: 'account_type'
  },
  parentAccountId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'parent_account_id',
    references: {
      model: 'chart_of_accounts',
      key: 'id'
    }
  },
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  openingBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'opening_balance'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'AED'
  },
  isSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_system'
  },
  isReconcilable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_reconcilable',
    comment: 'Flag for bank-related accounts that need reconciliation'
  },
  taxCategory: {
    type: DataTypes.ENUM('vat_applicable', 'vat_exempt', 'zero_rated', 'out_of_scope'),
    defaultValue: 'vat_exempt',
    field: 'tax_category',
    comment: 'Tax treatment for VAT reporting'
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'property_id',
    comment: 'Link to specific property for property-wise accounting',
    references: {
      model: 'properties',
      key: 'id'
    }
  },
  externalAccountId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'external_account_id',
    comment: 'External accounting system ID (QuickBooks, Xero)'
  },
  externalSystem: {
    type: DataTypes.ENUM('quickbooks', 'xero', 'other'),
    allowNull: true,
    field: 'external_system',
    comment: 'External system name'
  },
  syncStatus: {
    type: DataTypes.ENUM('synced', 'pending', 'failed', 'not_synced'),
    defaultValue: 'not_synced',
    field: 'sync_status',
    comment: 'Sync status with external system'
  },
  lastSyncedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_synced_at',
    comment: 'Last successful sync timestamp'
  }
}, {
  tableName: 'chart_of_accounts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_coa_tax_category',
      fields: ['tax_category']
    },
    {
      name: 'idx_coa_property',
      fields: ['property_id']
    },
    {
      name: 'idx_coa_reconcilable',
      fields: ['is_reconcilable']
    },
    {
      name: 'idx_coa_external_account',
      fields: ['external_account_id']
    },
    {
      name: 'idx_coa_property_type',
      fields: ['property_id', 'account_type']
    }
  ]
});

module.exports = ChartOfAccount;
