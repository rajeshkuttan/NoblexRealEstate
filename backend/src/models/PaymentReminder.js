const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const PaymentReminder = sequelize.define('PaymentReminder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  paymentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'payment_id',
    comment: 'Related payment',
    references: {
      model: 'payments',
      key: 'id'
    }
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'tenant_id',
    comment: 'Tenant to remind',
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
  reminderType: {
    type: DataTypes.ENUM('before_due', 'on_due', 'after_due', 'escalation'),
    allowNull: false,
    field: 'reminder_type',
    comment: 'Type of reminder'
  },
  method: {
    type: DataTypes.ENUM('email', 'sms', 'whatsapp', 'all'),
    defaultValue: 'email',
    comment: 'Communication method'
  },
  scheduledDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'scheduled_date',
    comment: 'When reminder should be sent'
  },
  sentDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'sent_date',
    comment: 'When reminder was actually sent'
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'failed', 'cancelled'),
    defaultValue: 'pending',
    comment: 'Reminder status'
  },
  emailSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'email_sent',
    comment: 'Email notification sent'
  },
  smsSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'sms_sent',
    comment: 'SMS notification sent'
  },
  whatsappSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'whatsapp_sent',
    comment: 'WhatsApp notification sent'
  },
  emailMessageId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'email_message_id',
    comment: 'Email service message ID'
  },
  smsMessageId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'sms_message_id',
    comment: 'SMS service message ID'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message',
    comment: 'Error details if failed'
  },
  retryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'retry_count',
    comment: 'Number of retry attempts'
  },
  maxRetries: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    field: 'max_retries',
    comment: 'Maximum retry attempts'
  },
  escalationLevel: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'escalation_level',
    comment: 'Escalation level (0 = initial, 1+ = escalated)'
  },
  responseReceived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'response_received',
    comment: 'Whether tenant responded'
  },
  responseDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'response_date',
    comment: 'When tenant responded'
  },
  responseNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'response_notes',
    comment: 'Tenant response notes'
  },
  templateUsed: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'template_used',
    comment: 'Template identifier used'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata'
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
  tableName: 'payment_reminders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_payment_reminders_payment',
      fields: ['payment_id']
    },
    {
      name: 'idx_payment_reminders_tenant',
      fields: ['tenant_id']
    },
    {
      name: 'idx_payment_reminders_status',
      fields: ['status']
    },
    {
      name: 'idx_payment_reminders_scheduled',
      fields: ['scheduled_date']
    }
  ],
  comment: 'Payment reminders and notifications'
});

module.exports = PaymentReminder;
