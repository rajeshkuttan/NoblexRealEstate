const { sequelize } = require('../src/config/database');
const { DataTypes } = require('sequelize');

async function addInvoiceIdColumn() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const tableInfo = await queryInterface.describeTable('payments');
    
    if (tableInfo.invoice_id) {
      console.log('Column invoice_id already exists.');
    } else {
      console.log('Adding invoice_id column...');
      await queryInterface.addColumn('payments', 'invoice_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'invoices',
          key: 'id'
        }
      });
      console.log('Column invoice_id added successfully.');
    }
  } catch (error) {
    console.error('Error adding column:', error);
  } finally {
    await sequelize.close();
  }
}

addInvoiceIdColumn();
