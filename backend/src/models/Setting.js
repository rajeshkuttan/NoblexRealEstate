const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Setting = sequelize.define('Setting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'key'
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'UAE, General, Email, etc.'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  dataType: {
    type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
    defaultValue: 'string',
    field: 'data_type'
  },
  isSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_system',
    comment: 'System settings cannot be deleted'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'settings',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['key']
    },
    {
      fields: ['category']
    }
  ]
});

module.exports = Setting;
