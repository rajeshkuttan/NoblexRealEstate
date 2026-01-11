/**
 * Migration: Add Foreign Key Constraints
 * Purpose: Add foreign keys that couldn't be added due to circular dependencies
 * Must run AFTER all tables are created
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add foreign key from bank_transactions to reconciliations
    await queryInterface.addConstraint('bank_transactions', {
      fields: ['reconciliation_id'],
      type: 'foreign key',
      name: 'fk_bank_transactions_reconciliation',
      references: {
        table: 'reconciliations',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    console.log('✓ Foreign key constraints added successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove foreign key from bank_transactions
    await queryInterface.removeConstraint('bank_transactions', 'fk_bank_transactions_reconciliation');
    
    console.log('✓ Foreign key constraints removed');
  }
};

