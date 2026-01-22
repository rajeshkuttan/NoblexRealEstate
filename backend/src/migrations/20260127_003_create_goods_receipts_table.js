/**
 * Migration: Create Goods Receipts Table
 * Purpose: Goods Receipts for Procurement Module
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('goods_receipts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      gr_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Auto-generated: GR-YYYY-XXXX'
      },
      purchase_order_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Foreign key to purchase_orders table',
        references: {
          model: 'purchase_orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      receipt_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Goods receipt date'
      },
      received_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'User who received the goods',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status: {
        type: Sequelize.ENUM('draft', 'completed', 'cancelled'),
        defaultValue: 'draft',
        comment: 'GR status'
      },
      line_items: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: '[]',
        comment: 'Line items: [{"item_id": 1, "ordered_qty": 10, "received_qty": 10, "unit_price": 100}]'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes'
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'User who created this GR',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
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
    }, {
      comment: 'Goods Receipts for Procurement Module'
    });

    // Add indexes
    await queryInterface.addIndex('goods_receipts', ['gr_number'], {
      name: 'idx_gr_number',
      unique: true
    });
    await queryInterface.addIndex('goods_receipts', ['purchase_order_id'], {
      name: 'idx_gr_po'
    });
    await queryInterface.addIndex('goods_receipts', ['status'], {
      name: 'idx_gr_status'
    });
    await queryInterface.addIndex('goods_receipts', ['receipt_date'], {
      name: 'idx_gr_date'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('goods_receipts');
  }
};
