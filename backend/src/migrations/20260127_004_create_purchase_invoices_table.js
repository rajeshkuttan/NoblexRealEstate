/**
 * Migration: Create Purchase Invoices Table
 * Purpose: Purchase Invoices for Procurement Module
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('purchase_invoices', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      invoice_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Auto-generated: PI-YYYY-XXXX'
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
      purchase_order_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Foreign key to purchase_orders table (optional)',
        references: {
          model: 'purchase_orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      goods_receipt_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Foreign key to goods_receipts table (optional)',
        references: {
          model: 'goods_receipts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      invoice_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Invoice date'
      },
      due_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Payment due date'
      },
      line_items: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: '[]',
        comment: 'Line items: [{"item_id": 1, "quantity": 10, "unit_price": 100, "total": 1000, "account_id": 5}]'
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
      status: {
        type: Sequelize.ENUM('draft', 'pending_approval', 'approved', 'paid', 'cancelled'),
        defaultValue: 'draft',
        comment: 'Invoice status'
      },
      payment_status: {
        type: Sequelize.ENUM('unpaid', 'partially_paid', 'paid'),
        defaultValue: 'unpaid',
        comment: 'Payment status'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes'
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'User who created this invoice',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'User who approved this invoice',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Approval timestamp'
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
      comment: 'Purchase Invoices for Procurement Module'
    });

    // Add indexes
    await queryInterface.addIndex('purchase_invoices', ['invoice_number'], {
      name: 'idx_pi_number',
      unique: true
    });
    await queryInterface.addIndex('purchase_invoices', ['vendor_id'], {
      name: 'idx_pi_vendor'
    });
    await queryInterface.addIndex('purchase_invoices', ['purchase_order_id'], {
      name: 'idx_pi_po'
    });
    await queryInterface.addIndex('purchase_invoices', ['goods_receipt_id'], {
      name: 'idx_pi_gr'
    });
    await queryInterface.addIndex('purchase_invoices', ['status'], {
      name: 'idx_pi_status'
    });
    await queryInterface.addIndex('purchase_invoices', ['payment_status'], {
      name: 'idx_pi_payment_status'
    });
    await queryInterface.addIndex('purchase_invoices', ['invoice_date'], {
      name: 'idx_pi_date'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('purchase_invoices');
  }
};
