'use strict';

const { BOOLEAN, DATE, literal } = require('sequelize');

const TABLES_TEST_DATA = [
  'investment_categories',
  'investment_assets',
  'investment_transactions',
  'investment_distributions',
  'investment_valuation_history',
  'investment_partner_allocations',
];

const TABLES_ARCHIVE = ['investment_categories', 'investment_assets'];

module.exports = {
  up: async (queryInterface) => {
    for (const table of TABLES_TEST_DATA) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.addColumn(table, 'is_test_data', {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
    for (const table of TABLES_ARCHIVE) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.addColumn(table, 'is_archived', {
        type: BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.addColumn(table, 'deleted_at', {
        type: DATE,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    for (const table of TABLES_ARCHIVE) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.removeColumn(table, 'deleted_at');
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.removeColumn(table, 'is_archived');
    }
    for (const table of TABLES_TEST_DATA) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.removeColumn(table, 'is_test_data');
    }
  },
};
