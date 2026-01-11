const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Lease = sequelize.define('Lease', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  leaseNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'lease_number'
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
  unitId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'unit_id',
    references: {
      model: 'units',
      key: 'id'
    }
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'end_date'
  },
  rentAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'rent_amount'
  },
  depositAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'deposit_amount'
  },
  paymentFrequency: {
    type: DataTypes.ENUM('monthly', 'quarterly', 'semi-annually', 'annually'),
    defaultValue: 'monthly',
    field: 'payment_frequency'
  },
  paymentDay: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'payment_day'
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'expired', 'terminated', 'renewed'),
    defaultValue: 'draft'
  },
  autoRenewal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'auto_renewal'
  },
  renewalPeriod: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'renewal_period'
  },
  renewalUnit: {
    type: DataTypes.ENUM('months', 'years'),
    allowNull: true,
    field: 'renewal_unit'
  },
  terms: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  specialConditions: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'special_conditions'
  },
  documents: {
    type: DataTypes.JSON,
    allowNull: true
  },
  signedDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'signed_date'
  },
  signedBy: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'signed_by'
  },
  witness1: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  witness2: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'leases',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Lease;
