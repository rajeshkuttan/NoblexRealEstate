const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const Cheque = sequelize.define('Cheque', {
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
  chequeNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'cheque_number',
    comment: 'Cheque number'
  },
  paymentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'payment_id',
    comment: 'Link to payment record',
    references: {
      model: 'payments',
      key: 'id'
    }
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'tenant_id',
    comment: 'Tenant who issued the cheque',
    references: {
      model: 'tenants',
      key: 'id'
    }
  },
  leaseId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'lease_id',
    comment: 'Related lease',
    references: {
      model: 'leases',
      key: 'id'
    }
  },
  invoiceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'invoice_id',
    comment: 'Related invoice',
    references: {
      model: 'invoices',
      key: 'id'
    }
  },
  bankAccountId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'bank_account_id',
    comment: 'Company bank account for deposit',
    references: {
      model: 'bank_accounts',
      key: 'id'
    }
  },
  bankName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'bank_name',
    comment: 'Issuing bank name'
  },
  branchName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'branch_name',
    comment: 'Bank branch'
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Cheque amount'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'AED',
    comment: 'Cheque currency'
  },
  chequeDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'cheque_date',
    comment: 'Date on the cheque (for PDC tracking)'
  },
  depositDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'deposit_date',
    comment: 'Date when cheque was deposited'
  },
  clearanceDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'clearance_date',
    comment: 'Date when cheque cleared'
  },
  bouncedDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'bounced_date',
    comment: 'Date when cheque bounced'
  },
  status: {
    type: DataTypes.ENUM('pending', 'received', 'deposited', 'cleared', 'bounced', 'cancelled', 'replaced'),
    defaultValue: 'pending',
    comment: 'Cheque status'
  },
  chequeType: {
    type: DataTypes.ENUM('pdc', 'current', 'security_deposit'),
    defaultValue: 'current',
    field: 'cheque_type',
    comment: 'Type of cheque'
  },
  bounceReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'bounce_reason',
    comment: 'Reason for bounce (insufficient funds, signature mismatch, etc.)'
  },
  bounceFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'bounce_fee',
    comment: 'Fee charged for bounced cheque'
  },
  replacementChequeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'replacement_cheque_id',
    comment: 'Link to replacement cheque if this one bounced',
    references: {
      model: 'cheques',
      key: 'id'
    }
  },
  originalChequeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'original_cheque_id',
    comment: 'Link to original cheque if this is a replacement',
    references: {
      model: 'cheques',
      key: 'id'
    }
  },
  scannedImage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'scanned_image',
    comment: 'Base64 encoded scanned image of cheque'
  },
  bankReference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'bank_reference',
    comment: 'Bank reference number for deposit'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes'
  },
  reminderSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'reminder_sent',
    comment: 'Whether reminder was sent before deposit date'
  },
  reminderSentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reminder_sent_at',
    comment: 'When reminder was sent'
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
  depositedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'deposited_by',
    comment: 'User who deposited the cheque',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isOpeningBalance: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_opening_balance',
    comment: 'Imported as legacy opening PDC (no GL on import)',
  },
  glDepositPosted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'gl_deposit_posted',
    comment: 'Deposit GL entries have been posted',
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
  tableName: 'cheques',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_cheques_payment',
      fields: ['payment_id']
    },
    {
      name: 'idx_cheques_tenant',
      fields: ['tenant_id']
    },
    {
      name: 'idx_cheques_lease',
      fields: ['lease_id']
    },
    {
      name: 'idx_cheques_status',
      fields: ['status']
    },
    {
      name: 'idx_cheques_cheque_date',
      fields: ['cheque_date']
    },
    {
      name: 'idx_cheques_number',
      fields: ['cheque_number', 'bank_name']
    }
  ],
  comment: 'Cheque and PDC tracking'
});

module.exports = Cheque;
