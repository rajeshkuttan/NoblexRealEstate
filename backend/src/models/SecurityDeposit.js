const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const SecurityDeposit = sequelize.define('SecurityDeposit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  depositNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'deposit_number',
    comment: 'Unique deposit reference number'
  },
  leaseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'lease_id',
    comment: 'Related lease',
    references: {
      model: 'leases',
      key: 'id'
    }
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'tenant_id',
    comment: 'Tenant who paid the deposit',
    references: {
      model: 'tenants',
      key: 'id'
    }
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'property_id',
    comment: 'Related property',
    references: {
      model: 'properties',
      key: 'id'
    }
  },
  bankAccountId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'bank_account_id',
    comment: 'Bank account holding the deposit',
    references: {
      model: 'bank_accounts',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Deposit amount'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'AED',
    comment: 'Deposit currency'
  },
  depositDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'deposit_date',
    comment: 'Date when deposit was received'
  },
  releaseDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'release_date',
    comment: 'Date when deposit was released'
  },
  status: {
    type: DataTypes.ENUM('held', 'released', 'partially_released', 'forfeited', 'transferred'),
    defaultValue: 'held',
    comment: 'Deposit status'
  },
  releaseAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'release_amount',
    comment: 'Amount released to tenant'
  },
  deductionAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'deduction_amount',
    comment: 'Amount deducted for damages/rent'
  },
  deductionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'deduction_reason',
    comment: 'Reason for deductions'
  },
  interestRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    field: 'interest_rate',
    comment: 'Annual interest rate (if applicable)'
  },
  accruedInterest: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'accrued_interest',
    comment: 'Interest accrued on deposit'
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'cheque', 'bank_transfer', 'online'),
    defaultValue: 'cheque',
    field: 'payment_method',
    comment: 'How deposit was paid'
  },
  chequeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'cheque_id',
    comment: 'Link to cheque if paid by cheque',
    references: {
      model: 'cheques',
      key: 'id'
    }
  },
  releaseMethod: {
    type: DataTypes.ENUM('cash', 'cheque', 'bank_transfer', 'online'),
    allowNull: true,
    field: 'release_method',
    comment: 'How deposit will be/was released'
  },
  releaseReference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'release_reference',
    comment: 'Reference for release transaction'
  },
  inspectionRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'inspection_required',
    comment: 'Whether inspection is required before release'
  },
  inspectionDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'inspection_date',
    comment: 'Date of property inspection'
  },
  inspectionStatus: {
    type: DataTypes.ENUM('pending', 'scheduled', 'completed', 'failed'),
    allowNull: true,
    field: 'inspection_status',
    comment: 'Inspection status'
  },
  inspectionNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'inspection_notes',
    comment: 'Notes from inspection'
  },
  inspectedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'inspected_by',
    comment: 'User who conducted inspection',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  documents: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Related documents (receipts, inspection reports)'
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
    comment: 'User who created this record',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  releasedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'released_by',
    comment: 'User who released the deposit',
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
  tableName: 'security_deposits',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_security_deposits_lease',
      fields: ['lease_id']
    },
    {
      name: 'idx_security_deposits_tenant',
      fields: ['tenant_id']
    },
    {
      name: 'idx_security_deposits_property',
      fields: ['property_id']
    },
    {
      name: 'idx_security_deposits_status',
      fields: ['status']
    },
    {
      name: 'idx_security_deposits_number',
      fields: ['deposit_number'],
      unique: true
    }
  ],
  comment: 'Security deposit tracking for leases'
});

module.exports = SecurityDeposit;
