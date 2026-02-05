'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    try {
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
    } catch (error) {
           console.log("Column 'invoice_id' already exists or conflict:", error.message);
    }
    
    // Add index for better performance
    try {
        await queryInterface.addIndex('cheques', ['invoice_id'], {
          name: 'idx_cheques_invoice_id'
        });
    } catch (error) {
        console.log("Index 'idx_cheques_invoice_id' creation failed (likely exists):", error.message);
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeIndex('cheques', 'idx_cheques_invoice_id');
    await queryInterface.removeColumn('cheques', 'invoice_id');
  }
};
