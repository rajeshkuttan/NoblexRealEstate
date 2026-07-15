const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LeaseRevenueVersion = sequelize.define(
  'LeaseRevenueVersion',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'company_id',
      references: { model: 'company_settings', key: 'id' },
    },
    scheduleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'schedule_id',
      references: { model: 'lease_revenue_schedules', key: 'id' },
    },
    versionNumber: { type: DataTypes.INTEGER, allowNull: false, field: 'version_number' },
    reason: { type: DataTypes.TEXT, allowNull: true },
    snapshotJson: { type: DataTypes.JSON, allowNull: true, field: 'snapshot_json' },
    createdBy: { type: DataTypes.INTEGER, allowNull: false, field: 'created_by' },
  },
  {
    tableName: 'lease_revenue_versions',
    timestamps: true,
    underscored: true,
  }
);

module.exports = LeaseRevenueVersion;
