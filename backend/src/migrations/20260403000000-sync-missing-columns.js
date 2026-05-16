'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Helper to add column if it doesn't exist
    const addColumnIfNotExists = async (table, column, definition) => {
      const tableInfo = await queryInterface.describeTable(table);
      if (!tableInfo[column]) {
        console.log(`- Adding ${table}.${column}...`);
        await queryInterface.addColumn(table, column, definition);
      } else {
        console.log(`- ${table}.${column} already exists.`);
      }
    };

    console.log('Starting migration to sync missing columns...');

    // Units table
    await addColumnIfNotExists('units', 'special_notes', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Special notes or remarks for the unit'
    });

    // Invoices table
    await addColumnIfNotExists('invoices', 'details', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: []
    });

    await addColumnIfNotExists('invoices', 'is_posted', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });

    await addColumnIfNotExists('invoices', 'posted_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    });

    await addColumnIfNotExists('invoices', 'posted_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await addColumnIfNotExists('invoices', 'transaction_no', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    // Purchase Invoices table
    await addColumnIfNotExists('purchase_invoices', 'is_posted', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });

    // Accounts Trans table
    await addColumnIfNotExists('accounts_trans', 'invoice_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'invoices',
        key: 'id'
      }
    });

    console.log('✅ Synchronized all missing columns.');
  },

  async down(queryInterface, Sequelize) {
    // Optional: Remove columns in reverse order if needed
    // However, since this is a synchronization migration for missing parts,
    // we might want to be careful with DOWN to avoid removing data 
    // that was actually supposed to be there.
    
    // For now, let's just reverse the additions.
    await queryInterface.removeColumn('accounts_trans', 'invoice_id');
    await queryInterface.removeColumn('purchase_invoices', 'is_posted');
    await queryInterface.removeColumn('invoices', 'transaction_no');
    await queryInterface.removeColumn('invoices', 'posted_at');
    await queryInterface.removeColumn('invoices', 'posted_by');
    await queryInterface.removeColumn('invoices', 'is_posted');
    await queryInterface.removeColumn('invoices', 'details');
    await queryInterface.removeColumn('units', 'special_notes');
  }
};
