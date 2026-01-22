const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Tenant = sequelize.define('Tenant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  emiratesId: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'emirates_id'
  },
  visaStatus: {
    type: DataTypes.ENUM('resident', 'tourist', 'visit', 'work', 'student'),
    allowNull: true,
    field: 'visa_status'
  },
  nationality: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  company: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  jobTitle: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'job_title'
  },
  salary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  employer: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  emergencyContact: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'emergency_contact'
  },
  emergencyPhone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'emergency_phone'
  },
  emergencyRelation: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'emergency_relation'
  },
  passportNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'passport_number'
  },
  visaNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'visa_number'
  },
  visaExpiry: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'visa_expiry'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  emirate: {
    type: DataTypes.ENUM('dubai', 'abu_dhabi', 'sharjah', 'ajman', 'ras_al_khaimah', 'fujairah', 'umm_al_quwain'),
    allowNull: true
  },
  postalCode: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'postal_code'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended', 'terminated'),
    defaultValue: 'active'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  documents: {
    type: DataTypes.JSON,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'tenants',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Tenant;
