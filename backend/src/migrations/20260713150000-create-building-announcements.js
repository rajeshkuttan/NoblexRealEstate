'use strict';

const { INTEGER, STRING, TEXT, DATE, BOOLEAN, ENUM, literal } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('building_announcements', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: {
        type: INTEGER,
        allowNull: false,
        references: { model: 'company_settings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      property_id: {
        type: INTEGER,
        allowNull: false,
        references: { model: 'properties', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      subject: { type: STRING(255), allowNull: false },
      body_html: { type: TEXT('long'), allowNull: false },
      status: {
        type: ENUM('draft', 'sent', 'failed'),
        allowNull: false,
        defaultValue: 'draft',
      },
      min_days_end_date: { type: INTEGER, allowNull: true, defaultValue: 60 },
      min_initial_term_days: { type: INTEGER, allowNull: true, defaultValue: 90 },
      strict_renewal_filter: { type: BOOLEAN, allowNull: false, defaultValue: false },
      max_send: { type: INTEGER, allowNull: true, defaultValue: 50 },
      recipient_count: { type: INTEGER, allowNull: true, defaultValue: 0 },
      emails_sent: { type: INTEGER, allowNull: true, defaultValue: 0 },
      emails_skipped: { type: INTEGER, allowNull: true, defaultValue: 0 },
      last_error: { type: TEXT, allowNull: true },
      sent_at: { type: DATE, allowNull: true },
      created_by: { type: INTEGER, allowNull: true },
      updated_by: { type: INTEGER, allowNull: true },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
      deleted_at: { type: DATE, allowNull: true },
    });
    await queryInterface.addIndex('building_announcements', ['company_id', 'property_id'], {
      name: 'idx_bldg_ann_company_property',
    });
    await queryInterface.addIndex('building_announcements', ['company_id', 'status'], {
      name: 'idx_bldg_ann_company_status',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('building_announcements');
  },
};
