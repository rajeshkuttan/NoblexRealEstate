const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DocumentNumbering = sequelize.define('DocumentNumbering', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  documentName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'document_name'
  },
  useTransactionNo: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'use_transaction_no'
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  currentNumber: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'current_number'
  },
  rangeFrom: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'range_from'
  },
  rangeTo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'range_to'
  },
  prefix: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  suffix: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  yearwiseSerial: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'yearwise_serial'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'document_numbering',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: false,
      fields: ['document_name']
    }
  ]
});

module.exports = DocumentNumbering;
