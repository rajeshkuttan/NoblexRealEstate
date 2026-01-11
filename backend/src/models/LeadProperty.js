const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LeadProperty = sequelize.define('LeadProperty', {
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
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'property_id',
    references: {
      model: 'properties',
      key: 'id'
    }
  },
  matchScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'match_score'
  },
  isFavorite: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_favorite'
  },
  viewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'viewed_at'
  },
  contactedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'contacted_at'
  }
}, {
  tableName: 'lead_properties',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['lead_id', 'property_id']
    }
  ]
});

module.exports = LeadProperty;
