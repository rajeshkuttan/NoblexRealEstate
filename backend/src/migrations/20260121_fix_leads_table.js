'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Sanitize 'requirements' data
    // Set invalid JSON data to NULL to prevent migration failure.
    // We check if it DOES NOT look like JSON (doesn't start with [ or {)
    await queryInterface.sequelize.query(
      `UPDATE leads SET requirements = NULL WHERE requirements IS NOT NULL AND requirements NOT REGEXP '^[\\\[\\\{]'`
    );

    // 2. Change 'source' to STRING
    await queryInterface.changeColumn('leads', 'source', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: 'website'
    });

    // 3. Change 'requirements' to JSON
    await queryInterface.changeColumn('leads', 'requirements', {
      type: Sequelize.JSON,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert 'source' to ENUM
    await queryInterface.changeColumn('leads', 'source', {
      type: Sequelize.ENUM('website', 'referral', 'walk_in', 'social_media', 'advertisement', 'other'),
      defaultValue: 'website'
    });

    // Revert 'requirements' to TEXT
    await queryInterface.changeColumn('leads', 'requirements', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  }
};
