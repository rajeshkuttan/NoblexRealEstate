const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const JournalVoucher = sequelize.define('JournalVoucher', {
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
  jvNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'jv_number'
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  narration: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  totalDebit: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'total_debit'
  },
  totalCredit: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'total_credit'
  },
  status: {
    type: DataTypes.ENUM('open', 'posted', 'cancelled'),
    defaultValue: 'open'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'property_id',
    references: {
      model: 'properties',
      key: 'id'
    }
  },
  postedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'posted_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  postedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'posted_at'
  }
}, {
  tableName: 'journal_vouchers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = JournalVoucher;
