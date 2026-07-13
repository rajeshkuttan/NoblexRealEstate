'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BuildingAnnouncement = sequelize.define(
  'BuildingAnnouncement',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: 'company_id' },
    propertyId: { type: DataTypes.INTEGER, allowNull: false, field: 'property_id' },
    subject: { type: DataTypes.STRING(255), allowNull: false },
    bodyHtml: { type: DataTypes.TEXT('long'), allowNull: false, field: 'body_html' },
    status: {
      type: DataTypes.ENUM('draft', 'sent', 'failed'),
      allowNull: false,
      defaultValue: 'draft',
    },
    minDaysEndDate: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 60, field: 'min_days_end_date' },
    minInitialTermDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 90,
      field: 'min_initial_term_days',
    },
    strictRenewalFilter: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'strict_renewal_filter',
    },
    maxSend: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 50, field: 'max_send' },
    recipientCount: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0, field: 'recipient_count' },
    emailsSent: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0, field: 'emails_sent' },
    emailsSkipped: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0, field: 'emails_skipped' },
    lastError: { type: DataTypes.TEXT, allowNull: true, field: 'last_error' },
    sentAt: { type: DataTypes.DATE, allowNull: true, field: 'sent_at' },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'updated_by' },
  },
  {
    tableName: 'building_announcements',
    underscored: true,
    paranoid: true,
    deletedAt: 'deleted_at',
  }
);

module.exports = BuildingAnnouncement;
