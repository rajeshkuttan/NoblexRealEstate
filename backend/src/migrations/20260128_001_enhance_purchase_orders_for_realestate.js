/**
 * Migration: Enhance Purchase Orders for Real Estate Domain
 * Purpose: Add property, unit, lease associations and delivery information
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns to purchase_orders table
    await queryInterface.addColumn('purchase_orders', 'property_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Optional property association',
      references: {
        model: 'properties',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('purchase_orders', 'unit_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Optional unit association',
      references: {
        model: 'units',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('purchase_orders', 'lease_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Optional lease association',
      references: {
        model: 'leases',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('purchase_orders', 'work_order_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Optional work order/maintenance request association'
    });

    await queryInterface.addColumn('purchase_orders', 'delivery_address', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Delivery address details'
    });

    await queryInterface.addColumn('purchase_orders', 'delivery_contact_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Contact person name for delivery'
    });

    await queryInterface.addColumn('purchase_orders', 'delivery_contact_phone', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Contact phone number for delivery'
    });

    await queryInterface.addColumn('purchase_orders', 'delivery_instructions', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Special delivery instructions'
    });

    // Add indexes for performance
    await queryInterface.addIndex('purchase_orders', ['property_id'], {
      name: 'idx_po_property'
    });

    await queryInterface.addIndex('purchase_orders', ['unit_id'], {
      name: 'idx_po_unit'
    });

    await queryInterface.addIndex('purchase_orders', ['lease_id'], {
      name: 'idx_po_lease'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('purchase_orders', 'idx_po_property');
    await queryInterface.removeIndex('purchase_orders', 'idx_po_unit');
    await queryInterface.removeIndex('purchase_orders', 'idx_po_lease');

    // Remove columns
    await queryInterface.removeColumn('purchase_orders', 'property_id');
    await queryInterface.removeColumn('purchase_orders', 'unit_id');
    await queryInterface.removeColumn('purchase_orders', 'lease_id');
    await queryInterface.removeColumn('purchase_orders', 'work_order_id');
    await queryInterface.removeColumn('purchase_orders', 'delivery_address');
    await queryInterface.removeColumn('purchase_orders', 'delivery_contact_name');
    await queryInterface.removeColumn('purchase_orders', 'delivery_contact_phone');
    await queryInterface.removeColumn('purchase_orders', 'delivery_instructions');
  }
};
