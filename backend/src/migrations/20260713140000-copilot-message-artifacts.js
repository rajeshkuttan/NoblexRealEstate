'use strict';

/** Add artifacts_json to copilot_messages for charts / export snapshots. */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('copilot_messages', 'artifacts_json', {
      type: Sequelize.JSON,
      allowNull: true,
      after: 'error_code',
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn('copilot_messages', 'artifacts_json');
  },
};
