'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payment_invoice_allocations', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      payment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'payments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      invoice_kind: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      invoice_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.addIndex('payment_invoice_allocations', ['payment_id'], {
      name: 'idx_pia_payment'
    });
    await queryInterface.addIndex('payment_invoice_allocations', ['invoice_kind', 'invoice_id'], {
      name: 'idx_pia_invoice'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payment_invoice_allocations');
  }
};
