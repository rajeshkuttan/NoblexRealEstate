'use strict';

/**
 * JSON map: per-emirate attestation authority + electricity provider labels (company-wide).
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('company_settings', 'emirate_authority_map', {
      type: Sequelize.JSON,
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('company_settings', 'emirate_authority_map');
  },
};
