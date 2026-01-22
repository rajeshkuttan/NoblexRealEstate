/**
 * Migration: Enhance Purchase Invoices Table for Real Estate Domain
 * Purpose: Add real estate associations and delivery information to purchase invoices
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add real estate association fields
    await queryInterface.addColumn('purchase_invoices', 'property_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'properties',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('purchase_invoices', 'unit_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'units',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('purchase_invoices', 'lease_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'leases',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('purchase_invoices', 'work_order_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Optional: Link to a work order for maintenance/projects'
      // No direct foreign key for work orders as it's not a core model yet
    });

    // Add delivery information fields
    await queryInterface.addColumn('purchase_invoices', 'delivery_address', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Specific delivery address for the invoice'
    });

    await queryInterface.addColumn('purchase_invoices', 'delivery_contact_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Contact person for delivery'
    });

    await queryInterface.addColumn('purchase_invoices', 'delivery_contact_phone', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Contact phone for delivery'
    });

    await queryInterface.addColumn('purchase_invoices', 'delivery_instructions', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Special delivery instructions'
    });

    // Add indexes for new foreign keys
    await queryInterface.addIndex('purchase_invoices', ['property_id'], { name: 'idx_pi_property' });
    await queryInterface.addIndex('purchase_invoices', ['unit_id'], { name: 'idx_pi_unit' });
    await queryInterface.addIndex('purchase_invoices', ['lease_id'], { name: 'idx_pi_lease' });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('purchase_invoices', 'idx_pi_lease');
    await queryInterface.removeIndex('purchase_invoices', 'idx_pi_unit');
    await queryInterface.removeIndex('purchase_invoices', 'idx_pi_property');

    // Remove columns
    await queryInterface.removeColumn('purchase_invoices', 'delivery_instructions');
    await queryInterface.removeColumn('purchase_invoices', 'delivery_contact_phone');
    await queryInterface.removeColumn('purchase_invoices', 'delivery_contact_name');
    await queryInterface.removeColumn('purchase_invoices', 'delivery_address');
    await queryInterface.removeColumn('purchase_invoices', 'work_order_id');
    await queryInterface.removeColumn('purchase_invoices', 'lease_id');
    await queryInterface.removeColumn('purchase_invoices', 'unit_id');
    await queryInterface.removeColumn('purchase_invoices', 'property_id');
  }
};
