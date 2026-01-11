const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ReportShare = sequelize.define('ReportShare', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reportName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'report_name',
    comment: 'Name of the report being shared'
  },
  reportData: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    field: 'report_data',
    comment: 'JSON or base64 encoded report data'
  },
  shareToken: {
    type: DataTypes.STRING(36),
    allowNull: false,
    unique: true,
    field: 'share_token',
    comment: 'UUID token for secure access'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at',
    comment: 'Token expiry date/time'
  },
  sharedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'shared_by',
    comment: 'User ID who shared the report',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  sharedWith: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'shared_with',
    comment: 'Email address(es) of recipients'
  },
  accessCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'access_count',
    comment: 'Number of times the report has been accessed'
  },
  lastAccessedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_accessed_at',
    comment: 'Last time the report was accessed'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Optional message from sender'
  },
  isRevoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_revoked',
    comment: 'Whether the share link has been revoked'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
    comment: 'Soft delete flag'
  }
}, {
  tableName: 'report_shares',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_report_shares_token',
      fields: ['share_token'],
      unique: true
    },
    {
      name: 'idx_report_shares_expires',
      fields: ['expires_at']
    },
    {
      name: 'idx_report_shares_shared_by',
      fields: ['shared_by']
    }
  ]
});

module.exports = ReportShare;
