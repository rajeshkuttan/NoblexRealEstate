const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TicketNote = sequelize.define('TicketNote', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ticketId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'ticket_id',
    references: {
      model: 'tickets',
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
  note: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isInternal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_internal'
  }
}, {
  tableName: 'ticket_notes',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = TicketNote;
