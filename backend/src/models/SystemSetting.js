const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SystemSetting = sequelize.define('SystemSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  settingKey: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'setting_key'
  },
  settingValue: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'setting_value'
  },
  settingType: {
    type: DataTypes.ENUM('string', 'number', 'boolean', 'json', 'date'),
    allowNull: false,
    field: 'setting_type'
  },
  category: {
    type: DataTypes.ENUM('general', 'email', 'sms', 'notification', 'security', 'backup', 'integration', 'ui'),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isEncrypted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_encrypted'
  },
  isReadOnly: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_read_only'
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'updated_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'system_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = SystemSetting;
