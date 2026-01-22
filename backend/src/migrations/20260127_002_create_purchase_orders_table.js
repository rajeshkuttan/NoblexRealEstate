/**
 * Migration: Create Purchase Orders Table
 * Purpose: Purchase Orders for Procurement Module
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('purchase_orders', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      po_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Auto-generated: PO-YYYY-XXXX'
      },
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Foreign key to vendors table',
        references: {
          model: 'vendors',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      po_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Purchase order date'
      },
      expected_delivery_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Expected delivery date'
      },
      status: {
        type: Sequelize.ENUM('draft', 'sent', 'acknowledged', 'partially_received', 'fully_received', 'cancelled'),
        defaultValue: 'draft',
        comment: 'PO status'
      },
      line_items: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: '[]',
        comment: 'Line items: [{"item_id": 1, "quantity": 10, "unit_price": 100, "total": 1000}]'
      },
      subtotal: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Subtotal before tax'
      },
      tax_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Tax amount (VAT)'
      },
      total_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Total amount including tax'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes'
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'User who created this PO',
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
      comment: 'Purchase Orders for Procurement Module'
    });

    // Add indexes
    await queryInterface.addIndex('purchase_orders', ['po_number'], {
      name: 'idx_po_number',
      unique: true
    });
    await queryInterface.addIndex('purchase_orders', ['vendor_id'], {
      name: 'idx_po_vendor'
    });
    await queryInterface.addIndex('purchase_orders', ['status'], {
      name: 'idx_po_status'
    });
    await queryInterface.addIndex('purchase_orders', ['po_date'], {
      name: 'idx_po_date'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('purchase_orders');
  }
};
