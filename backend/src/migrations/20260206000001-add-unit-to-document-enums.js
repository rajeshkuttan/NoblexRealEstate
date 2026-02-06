'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Modify entity_type ENUM to include 'unit'
    // Note: This is MySQL specific syntax for modifying ENUMs
    await queryInterface.sequelize.query(
      "ALTER TABLE documents MODIFY COLUMN entity_type ENUM('vendor', 'lead', 'invoice', 'unit') NOT NULL COMMENT 'Type of entity (vendor, lead, invoice, or unit)'"
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Revert to original ENUM (WARNING: This might fail if there are 'unit' records)
    // We typically don't revert data-loss changes in down migrations recklessly, 
    // but for completeness:
    // await queryInterface.sequelize.query(
    //   "ALTER TABLE documents MODIFY COLUMN entity_type ENUM('vendor', 'lead', 'invoice') NOT NULL COMMENT 'Type of entity (vendor, lead, or invoice)'"
    // );
  }
};
