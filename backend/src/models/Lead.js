const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Lead = sequelize.define('Lead', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'company_id',
    references: {
      model: 'company_settings',
      key: 'id'
    }
  },
  // Basic Information
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  company: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  position: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  
  // UAE Specific Fields
  emiratesId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      len: [15, 20]
    },
    field: 'emirates_id'
  },
  visaStatus: {
    type: DataTypes.ENUM('resident', 'tourist', 'investor', 'student', 'other'),
    allowNull: true,
    field: 'visa_status'
  },
  nationality: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  tradeLicense: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'trade_license'
  },
  companyType: {
    type: DataTypes.ENUM('llc', 'freezone', 'branch', 'representative', 'other'),
    allowNull: true,
    field: 'company_type'
  },
  bankName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'bank_name'
  },
  salaryCertificate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'salary_certificate'
  },
  
  // Property Preferences
  emirate: {
    type: DataTypes.ENUM('dubai', 'abu_dhabi', 'sharjah', 'ajman', 'ras_al_khaimah', 'fujairah', 'umm_al_quwain'),
    allowNull: true
  },
  community: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  buildingType: {
    type: DataTypes.ENUM('apartment', 'villa', 'townhouse', 'penthouse', 'duplex', 'studio', 'office', 'retail', 'warehouse'),
    allowNull: true,
    field: 'building_type'
  },
  furnished: {
    type: DataTypes.ENUM('furnished', 'semi_furnished', 'unfurnished'),
    allowNull: true
  },
  bedrooms: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  bathrooms: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  area: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  budget: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  moveInDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'move_in_date'
  },
  propertyType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'residential',
    field: 'property_type'
  },
  
  // Lead Management
  status: {
    type: DataTypes.ENUM('new', 'contacted', 'qualified', 'viewing', 'negotiation', 'proposal', 'closed_won', 'closed_lost'),
    defaultValue: 'new'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium'
  },
  source: {
    type: DataTypes.STRING(100),
    defaultValue: 'website'
  },
  leadScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'lead_score'
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'assigned_to',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  
  // Compliance
  complianceStatus: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected', 'under_review'),
    defaultValue: 'pending',
    field: 'compliance_status'
  },
  kycStatus: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending',
    field: 'kyc_status'
  },
  antiMoneyLaundering: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'anti_money_laundering'
  },
  
  // Additional Info
  requirements: {
    type: DataTypes.JSON,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true
  },
  documents: {
    type: DataTypes.JSON,
    allowNull: true
  },
  
  // Timestamps
  lastContactDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_contact_date'
  },
  nextFollowUp: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'next_follow_up'
  }
}, {
  tableName: 'leads',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Lead;
