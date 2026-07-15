const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LeaseRevenueComponent = sequelize.define(
  'LeaseRevenueComponent',
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
    componentCode: { type: DataTypes.STRING(50), allowNull: false, field: 'component_code' },
    componentName: { type: DataTypes.STRING(200), allowNull: false, field: 'component_name' },
    leaseChargeId: { type: DataTypes.INTEGER, allowNull: true, field: 'lease_charge_id' },
    serviceId: { type: DataTypes.INTEGER, allowNull: true, field: 'service_id' },
    amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
    revenueType: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'OTHER',
      field: 'revenue_type',
    },
    revenueAccountId: { type: DataTypes.INTEGER, allowNull: true, field: 'revenue_account_id' },
    deferredRevenueAccountId: { type: DataTypes.INTEGER, allowNull: true, field: 'deferred_revenue_account_id' },
    startDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'start_date' },
    endDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'end_date' },
  },
  {
    tableName: 'lease_revenue_components',
    timestamps: true,
    underscored: true,
  }
);

module.exports = LeaseRevenueComponent;
