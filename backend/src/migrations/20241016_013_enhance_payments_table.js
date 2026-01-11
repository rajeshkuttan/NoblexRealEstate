/**
 * Migration: Enhance Payments Table
 * Purpose: Add bank transaction and reconciliation links
 * Related to: FINANCE_DATABASE_ERD.md - Section 5.5
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns
    await queryInterface.addColumn('payments', 'bank_transaction_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      field: 'bank_transaction_id',
      comment: 'Link to bank transaction if from statement',
      references: {
        model: 'bank_transactions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('payments', 'reconciliation_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      field: 'reconciliation_id',
      comment: 'Link to reconciliation record',
      references: {
        model: 'reconciliations',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('payments', 'is_reconciled', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'is_reconciled',
      comment: 'Reconciliation status'
    });

    // Add indexes for new columns
    await queryInterface.addIndex('payments', ['bank_transaction_id'], {
      name: 'idx_payment_bank_transaction_id'
    });

    await queryInterface.addIndex('payments', ['reconciliation_id'], {
      name: 'idx_payment_reconciliation_id'
    });

    await queryInterface.addIndex('payments', ['is_reconciled'], {
      name: 'idx_payment_reconciled'
    });

    // Composite index for reconciliation queries
    await queryInterface.addIndex('payments', ['payment_date', 'is_reconciled'], {
      name: 'idx_payment_date_reconciled'
    });

    console.log('✓ Payments table enhanced successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('payments', 'idx_payment_bank_transaction_id');
    await queryInterface.removeIndex('payments', 'idx_payment_reconciliation_id');
    await queryInterface.removeIndex('payments', 'idx_payment_reconciled');
    await queryInterface.removeIndex('payments', 'idx_payment_date_reconciled');

    // Remove columns
    await queryInterface.removeColumn('payments', 'is_reconciled');
    await queryInterface.removeColumn('payments', 'reconciliation_id');
    await queryInterface.removeColumn('payments', 'bank_transaction_id');

    console.log('✓ Payments table reverted');
  }
};

