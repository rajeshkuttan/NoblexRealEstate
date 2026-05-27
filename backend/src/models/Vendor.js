const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const Vendor = sequelize.define('Vendor', {
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
  vendorName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'vendor_name',
    comment: 'Vendor/supplier business name'
  },
  contactPerson: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'contact_person',
    comment: 'Primary contact person'
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Primary email address'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Primary phone number'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Physical address'
  },
  trn: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'UAE Tax Registration Number'
  },
  paymentTerms: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'payment_terms',
    defaultValue: 'Net 30',
    comment: 'Payment terms (e.g., Net 30, Net 60)'
  },
  bankDetails: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'bank_details',
    comment: 'Bank account information for payments'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'blocked'),
    defaultValue: 'active',
    comment: 'Vendor status'
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
    comment: 'User who created this vendor',
    references: {
      model: 'users',
      key: 'id'
    }
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
  tableName: 'vendors',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [],
  comment: 'Vendor/Supplier master data for accounts payable'
});

module.exports = Vendor;

