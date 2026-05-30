const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ticketNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'ticket_number'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'tenant_id',
    references: {
      model: 'tenants',
      key: 'id'
    }
  },
  unitId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'unit_id',
    references: {
      model: 'units',
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
  category: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed', 'cancelled'),
    defaultValue: 'open'
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
  vendorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'vendor_id',
    references: {
      model: 'vendors',
      key: 'id'
    }
  },
  reportedBy: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'reported_by'
  },
  contactPhone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'contact_phone'
  },
  contactEmail: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'contact_email'
  },
  estimatedCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'estimated_cost'
  },
  actualCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'actual_cost'
  },
  scheduledDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'scheduled_date'
  },
  completedDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_date'
  },
  resolution: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'tickets',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Ticket;
