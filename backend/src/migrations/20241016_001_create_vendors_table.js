/**
 * Migration: Create Vendors Table
 * Purpose: Accounts Payable - Vendor Management
 * Related to: FINANCE_DATABASE_ERD.md - Section 4.1
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('vendors', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      vendorName: {
        type: Sequelize.STRING(200),
        allowNull: false,
        field: 'vendor_name',
        comment: 'Vendor/supplier business name'
      },
      contactPerson: {
        type: Sequelize.STRING(100),
        allowNull: true,
        field: 'contact_person',
        comment: 'Primary contact person'
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Primary email address'
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Primary phone number'
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Physical address'
      },
      trn: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
        comment: 'UAE Tax Registration Number'
      },
      paymentTerms: {
        type: Sequelize.STRING(100),
        allowNull: true,
        field: 'payment_terms',
        defaultValue: 'Net 30',
        comment: 'Payment terms (e.g., Net 30, Net 60)'
      },
      bankDetails: {
        type: Sequelize.JSON,
        allowNull: true,
        field: 'bank_details',
        comment: 'Bank account information for payments'
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'blocked'),
        defaultValue: 'active',
        comment: 'Vendor status'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes'
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'created_by',
        comment: 'User who created this vendor',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
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
      comment: 'Vendor/Supplier master data for accounts payable',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    // Add indexes
    await queryInterface.addIndex('vendors', ['vendor_name'], {
      name: 'idx_vendor_name'
    });

    await queryInterface.addIndex('vendors', ['email'], {
      name: 'idx_vendor_email'
    });

    await queryInterface.addIndex('vendors', ['trn'], {
      name: 'idx_vendor_trn'
    });

    await queryInterface.addIndex('vendors', ['status'], {
      name: 'idx_vendor_status'
    });

    await queryInterface.addIndex('vendors', ['is_active'], {
      name: 'idx_vendor_active'
    });

    await queryInterface.addIndex('vendors', ['created_by'], {
      name: 'idx_vendor_created_by'
    });

    console.log('✓ Vendors table created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('vendors');
    console.log('✓ Vendors table dropped');
  }
};

