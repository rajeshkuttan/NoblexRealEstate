const { sequelize, Sequelize } = require('../config/database');

async function fixPaymentsColumns() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const tableInfo = await queryInterface.describeTable('payments');

    console.log('Checking payments table columns...');

    if (!tableInfo.vendor_id) {
      console.log('Adding vendor_id column...');
      await queryInterface.addColumn('payments', 'vendor_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'vendors',
          key: 'id'
        }
      });
      console.log('✅ Added vendor_id column');
    } else {
      console.log('ℹ️ vendor_id column already exists');
    }

    if (!tableInfo.details) {
      console.log('Adding details column...');
      await queryInterface.addColumn('payments', 'details', {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: []
      });
      console.log('✅ Added details column');
    }

    if (!tableInfo.isReconciled) {
      console.log('Adding isReconciled column...');
      await queryInterface.addColumn('payments', 'isReconciled', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });
      console.log('✅ Added isReconciled column');
    }

    if (!tableInfo.bank_transaction_id) {
      console.log('Adding bank_transaction_id column...');
      await queryInterface.addColumn('payments', 'bank_transaction_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'bank_transactions',
          key: 'id'
        }
      });
      console.log('✅ Added bank_transaction_id column');
    }

    if (!tableInfo.reconciliation_id) {
      console.log('Adding reconciliation_id column...');
      await queryInterface.addColumn('payments', 'reconciliation_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'reconciliations',
          key: 'id'
        }
      });
      console.log('✅ Added reconciliation_id column');
    }

    console.log('Modifying lease_id and tenant_id to allow NULL...');
    await queryInterface.changeColumn('payments', 'lease_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.changeColumn('payments', 'tenant_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    console.log('✅ Modified lease_id and tenant_id to allow NULL');

    console.log('🚀 Payments table sync completed!');
  } catch (error) {
    console.error('❌ Error fixing payments table:', error);
  } finally {
    await sequelize.close();
  }
}

fixPaymentsColumns();
