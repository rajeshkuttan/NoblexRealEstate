const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SystemIntegrityAudit = sequelize.define(
  'SystemIntegrityAudit',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    runId: { type: DataTypes.STRING(36), allowNull: false, field: 'run_id' },
    auditType: { type: DataTypes.STRING(80), allowNull: false, field: 'audit_type' },
    severity: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
      allowNull: false,
      defaultValue: 'MEDIUM',
    },
    recordCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'record_count' },
    detailsJson: { type: DataTypes.JSON, allowNull: true, field: 'details_json' },
    status: {
      type: DataTypes.ENUM('running', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'completed',
    },
  },
  {
    tableName: 'system_integrity_audits',
    timestamps: true,
    underscored: true,
  }
);

module.exports = SystemIntegrityAudit;
