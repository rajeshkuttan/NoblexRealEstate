'use strict';

/**
 * Phase 17 holdings/lots omitted is_test_data while intelligence queries filter on it
 * via testDataWhere(req) → Unknown column 'InvestmentHoldingV2.isTestData'.
 */
const { BOOLEAN } = require('sequelize');

const TABLES = ['investment_holdings_v2', 'investment_position_lots'];

async function columnExists(queryInterface, table, column) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column`,
    { replacements: { table, column } }
  );
  return rows.length > 0;
}

module.exports = {
  up: async (queryInterface) => {
    for (const table of TABLES) {
      // eslint-disable-next-line no-await-in-loop
      if (!(await columnExists(queryInterface, table, 'is_test_data'))) {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.addColumn(table, 'is_test_data', {
          type: BOOLEAN,
          allowNull: false,
          defaultValue: false,
        });
      }
    }
  },

  down: async (queryInterface) => {
    for (const table of TABLES) {
      // eslint-disable-next-line no-await-in-loop
      if (await columnExists(queryInterface, table, 'is_test_data')) {
        // eslint-disable-next-line no-await-in-loop
        await queryInterface.removeColumn(table, 'is_test_data');
      }
    }
  },
};
