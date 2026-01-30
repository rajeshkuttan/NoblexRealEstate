'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('cheques', 'invoice_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'invoices',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    // Add index for better performance
    await queryInterface.addIndex('cheques', ['invoice_id'], {
      name: 'idx_cheques_invoice_id'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeIndex('cheques', 'idx_cheques_invoice_id');
    await queryInterface.removeColumn('cheques', 'invoice_id');
  }
};
