/**
 * Migration: Create Vendor Invoices Table
 * Purpose: Accounts Payable - Vendor Invoice Management
 * Related to: FINANCE_DATABASE_ERD.md - Section 4.2
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('vendor_invoices', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      invoiceNumber: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        field: 'invoice_number',
        comment: 'Unique invoice number'
      },
      vendorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'vendor_id',
        comment: 'Foreign key to vendors table',
        references: {
          model: 'vendors',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      propertyId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'property_id',
        comment: 'Property this invoice relates to',
        references: {
          model: 'properties',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      invoiceDate: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'invoice_date',
        comment: 'Invoice issue date'
      },
      dueDate: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'due_date',
        comment: 'Payment due date'
      },
      subtotal: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Subtotal before tax'
      },
      taxAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'tax_amount',
        comment: 'VAT amount'
      },
      totalAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'total_amount',
        comment: 'Total amount including tax'
      },
      status: {
        type: Sequelize.ENUM('draft', 'pending_approval', 'approved', 'rejected', 'cancelled'),
        defaultValue: 'draft',
        comment: 'Invoice approval status'
      },
      paymentStatus: {
        type: Sequelize.ENUM('unpaid', 'partially_paid', 'paid', 'overdue'),
        defaultValue: 'unpaid',
        field: 'payment_status',
        comment: 'Payment status'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Invoice description/notes'
      },
      attachments: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Invoice document attachments'
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'created_by',
        comment: 'User who created this invoice',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      approvedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'approved_by',
        comment: 'User who approved this invoice',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'approved_at',
        comment: 'Approval timestamp'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
        comment: 'Soft delete flag'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updated_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    }, {
      comment: 'Vendor invoices for accounts payable management',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    // Add indexes
    await queryInterface.addIndex('vendor_invoices', ['invoice_number'], {
      name: 'idx_vi_invoice_number'
    });

    await queryInterface.addIndex('vendor_invoices', ['vendor_id'], {
      name: 'idx_vi_vendor_id'
    });

    await queryInterface.addIndex('vendor_invoices', ['property_id'], {
      name: 'idx_vi_property_id'
    });

    await queryInterface.addIndex('vendor_invoices', ['invoice_date'], {
      name: 'idx_vi_invoice_date'
    });

    await queryInterface.addIndex('vendor_invoices', ['due_date'], {
      name: 'idx_vi_due_date'
    });

    await queryInterface.addIndex('vendor_invoices', ['status'], {
      name: 'idx_vi_status'
    });

    await queryInterface.addIndex('vendor_invoices', ['payment_status'], {
      name: 'idx_vi_payment_status'
    });

    await queryInterface.addIndex('vendor_invoices', ['is_active'], {
      name: 'idx_vi_active'
    });

    // Composite index for aging reports
    await queryInterface.addIndex('vendor_invoices', ['payment_status', 'due_date'], {
      name: 'idx_vi_aging'
    });

    console.log('✓ Vendor Invoices table created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('vendor_invoices');
    console.log('✓ Vendor Invoices table dropped');
  }
};

