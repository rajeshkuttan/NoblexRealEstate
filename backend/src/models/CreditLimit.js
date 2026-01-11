const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const CreditLimit = sequelize.define('CreditLimit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'tenant_id',
    comment: 'Tenant for credit limit',
    references: {
      model: 'tenants',
      key: 'id'
    }
  },
  creditLimit: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    field: 'credit_limit',
    comment: 'Maximum credit allowed'
  },
  currentBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'current_balance',
    comment: 'Current outstanding balance'
  },
  availableCredit: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'available_credit',
    comment: 'Available credit (limit - balance)'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'AED',
    comment: 'Credit currency'
  },
  creditScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'credit_score',
    comment: 'Internal credit score (0-100)'
  },
  riskLevel: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium',
    field: 'risk_level',
    comment: 'Risk assessment level'
  },
  paymentTermsDays: {
    type: DataTypes.INTEGER,
    defaultValue: 30,
    field: 'payment_terms_days',
    comment: 'Payment terms in days'
  },
  overdueAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'overdue_amount',
    comment: 'Total overdue amount'
  },
  daysOverdue: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'days_overdue',
    comment: 'Days overdue for oldest payment'
  },
  collectionStage: {
    type: DataTypes.ENUM('none', 'reminder', 'warning', 'final_notice', 'legal', 'write_off'),
    defaultValue: 'none',
    field: 'collection_stage',
    comment: 'Current collection stage'
  },
  lastCollectionDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_collection_date',
    comment: 'Last collection action date'
  },
  collectionNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'collection_notes',
    comment: 'Collection action history'
  },
  creditHold: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'credit_hold',
    comment: 'Whether credit is on hold'
  },
  creditHoldReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'credit_hold_reason',
    comment: 'Reason for credit hold'
  },
  lastReviewDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_review_date',
    comment: 'Last credit review date'
  },
  nextReviewDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'next_review_date',
    comment: 'Next scheduled review date'
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'approved_by',
    comment: 'User who approved credit limit',
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
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes'
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
  tableName: 'credit_limits',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_credit_limits_tenant',
      fields: ['tenant_id'],
      unique: true
    },
    {
      name: 'idx_credit_limits_risk',
      fields: ['risk_level']
    },
    {
      name: 'idx_credit_limits_collection',
      fields: ['collection_stage']
    }
  ],
  comment: 'Credit limits and collection management'
});

module.exports = CreditLimit;
