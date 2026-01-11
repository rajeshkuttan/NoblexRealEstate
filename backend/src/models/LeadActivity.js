const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LeadActivity = sequelize.define('LeadActivity', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  leadId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'lead_id',
    references: {
      model: 'leads',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  activityType: {
    type: DataTypes.ENUM('call', 'email', 'whatsapp', 'meeting', 'viewing', 'proposal', 'follow_up', 'note'),
    allowNull: false,
    field: 'activity_type'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  scheduledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'scheduled_at'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  }
}, {
  tableName: 'lead_activities',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = LeadActivity;
