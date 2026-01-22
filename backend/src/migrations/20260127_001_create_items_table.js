/**
 * Migration: Create Items Table
 * Purpose: Item Master for Procurement Module
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      item_code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Auto-generated: ITM-YYYY-XXXX'
      },
      item_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Item name/description'
      },
      item_category: {
        type: Sequelize.ENUM('material', 'service', 'equipment', 'supplies', 'other'),
        allowNull: false,
        defaultValue: 'material',
        comment: 'Item category'
      },
      unit_of_measure: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pcs',
        comment: 'Unit of measure (pcs, kg, m, box, set, etc.)'
      },
      account_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Foreign key to chart_of_accounts (expense/asset account)',
        references: {
          model: 'chart_of_accounts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Item description'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Active status'
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'User who created this item',
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
      comment: 'Item Master for Procurement Module'
    });

    // Add indexes
    await queryInterface.addIndex('items', ['item_code'], {
      name: 'idx_items_code',
      unique: true
    });
    await queryInterface.addIndex('items', ['account_id'], {
      name: 'idx_items_account'
    });
    await queryInterface.addIndex('items', ['item_category'], {
      name: 'idx_items_category'
    });
    await queryInterface.addIndex('items', ['is_active'], {
      name: 'idx_items_active'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('items');
  }
};
