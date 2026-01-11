const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Property = sequelize.define('Property', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
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
  price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  pricePerSqft: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'price_per_sqft'
  },
  furnished: {
    type: DataTypes.ENUM('furnished', 'semi_furnished', 'unfurnished'),
    allowNull: true
  },
  amenities: {
    type: DataTypes.JSON,
    allowNull: true
  },
  features: {
    type: DataTypes.JSON,
    allowNull: true
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true
  },
  availability: {
    type: DataTypes.ENUM('available', 'rented', 'sold', 'maintenance'),
    defaultValue: 'available'
  },
  moveInDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'move_in_date'
  },
  agentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'agent_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'properties',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Property;
