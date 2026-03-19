const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LegalCase = sequelize.define('LegalCase', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  caseNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'case_number'
  },
  leaseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'lease_id',
    references: {
      model: 'leases',
      key: 'id'
    }
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'tenant_id',
    references: {
      model: 'tenants',
      key: 'id'
    }
  },
  unitId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'unit_id',
    references: {
      model: 'units',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'start_date'
  },
  expectedClosureDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'expected_closure_date'
  },
  status: {
    type: DataTypes.ENUM('dispute', 'npa', 'case', 'available', 'case_closed'),
    defaultValue: 'dispute'
  },
  consultantDetails: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'consultant_details'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_approved'
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'approved_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  },
  closedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'closed_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  closedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'closed_at'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'legal_cases',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = LegalCase;
