const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('Starting Payment Voucher Post/Unpost schema update...');

    // 1. Update payments table
    const paymentColumns = await queryInterface.describeTable('payments');
    
    if (!paymentColumns.is_posted) {
      await queryInterface.addColumn('payments', 'is_posted', {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      });
      console.log('Added is_posted to payments');
    }

    if (!paymentColumns.posted_by) {
      await queryInterface.addColumn('payments', 'posted_by', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      });
      console.log('Added posted_by to payments');
    }

    if (!paymentColumns.posted_at) {
      await queryInterface.addColumn('payments', 'posted_at', {
        type: DataTypes.DATE,
        allowNull: true
      });
      console.log('Added posted_at to payments');
    }

    if (!paymentColumns.transaction_no) {
      await queryInterface.addColumn('payments', 'transaction_no', {
        type: DataTypes.INTEGER,
        allowNull: true
      });
      console.log('Added transaction_no to payments');
    }

    // 2. Update accounts_trans table
    const transColumns = await queryInterface.describeTable('accounts_trans');

    // Make jv_id and jv_number optional
    await queryInterface.changeColumn('accounts_trans', 'jv_id', {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    console.log('Modified jv_id to allow NULL in accounts_trans');

    await queryInterface.changeColumn('accounts_trans', 'jv_number', {
      type: DataTypes.STRING(50),
      allowNull: true
    });
    console.log('Modified jv_number to allow NULL in accounts_trans');

    if (!transColumns.payment_id) {
      await queryInterface.addColumn('accounts_trans', 'payment_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'payments',
          key: 'id'
        }
      });
      console.log('Added payment_id to accounts_trans');
    }

    console.log('Schema update completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Schema update failed:', error);
    process.exit(1);
  }
}

migrate();
