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
  leaseType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'residential',
    field: 'lease_type'
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
  documents: {
    type: DataTypes.JSON,
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
  },
  // Added fields for extended lease details
  agencyFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'agency_fee'
  },
  ejariFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'ejari_fee'
  },
  dewaDeposit: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'dewa_deposit'
  },
  municipalityFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'municipality_fee'
  },
  totalDeposits: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'total_deposits'
  },
  gracePeriod: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'grace_period'
  },
  lateFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'late_fee'
  },
  renewalTerms: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'renewal_terms'
  },
  terminationNotice: {
    type: DataTypes.INTEGER,
    defaultValue: 60,
    field: 'termination_notice'
  },
  propertyType: {
    type: DataTypes.STRING(50),
    defaultValue: 'residential',
    field: 'property_type'
  },
  pdcStartDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'pdc_start_date'
  },
  isRentalTaxable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_rental_taxable'
  },
  pdcSchedule: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'pdc_schedule'
  },
  compliance: {
    type: DataTypes.JSON,
    allowNull: true,
  }
}, {
  tableName: 'leases',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Lease;
