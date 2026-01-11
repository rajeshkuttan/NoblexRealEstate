const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CompanySetting = sequelize.define('CompanySetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  companyName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'company_name'
  },
  companyNameArabic: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: 'company_name_arabic'
  },
  tradeLicense: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'trade_license'
  },
  commercialRegister: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'commercial_register'
  },
  taxNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'tax_number'
  },
  vatNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'vat_number'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  emirate: {
    type: DataTypes.ENUM('Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'),
    allowNull: true
  },
  postalCode: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'postal_code'
  },
  country: {
    type: DataTypes.STRING(50),
    defaultValue: 'UAE'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  website: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  logo: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'AED'
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'Asia/Dubai'
  },
  language: {
    type: DataTypes.STRING(5),
    defaultValue: 'en'
  },
  fiscalYearStart: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fiscal_year_start'
  },
  fiscalYearEnd: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fiscal_year_end'
  },
  businessHours: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'business_hours'
  },
  socialMedia: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'social_media'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'company_settings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = CompanySetting;
