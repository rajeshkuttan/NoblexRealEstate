/**
 * Migration: Enhance Goods Receipts for Real Estate Domain
 * Purpose: Add delivery location fields for real estate tracking
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns to goods_receipts table
    await queryInterface.addColumn('goods_receipts', 'delivery_property_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Actual delivery property',
      references: {
        model: 'properties',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('goods_receipts', 'delivery_unit_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Actual delivery unit',
      references: {
        model: 'units',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('goods_receipts', 'delivery_address', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Full delivery address'
    });

    await queryInterface.addColumn('goods_receipts', 'delivery_contact_name', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Person who received the goods'
    });

    await queryInterface.addColumn('goods_receipts', 'delivery_contact_phone', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Contact phone number'
    });

    await queryInterface.addColumn('goods_receipts', 'delivery_notes', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Delivery-specific notes'
    });

    // Add indexes for performance
    await queryInterface.addIndex('goods_receipts', ['delivery_property_id'], {
      name: 'idx_gr_delivery_property'
    });

    await queryInterface.addIndex('goods_receipts', ['delivery_unit_id'], {
      name: 'idx_gr_delivery_unit'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('goods_receipts', 'idx_gr_delivery_property');
    await queryInterface.removeIndex('goods_receipts', 'idx_gr_delivery_unit');

    // Remove columns
    await queryInterface.removeColumn('goods_receipts', 'delivery_property_id');
    await queryInterface.removeColumn('goods_receipts', 'delivery_unit_id');
    await queryInterface.removeColumn('goods_receipts', 'delivery_address');
    await queryInterface.removeColumn('goods_receipts', 'delivery_contact_name');
    await queryInterface.removeColumn('goods_receipts', 'delivery_contact_phone');
    await queryInterface.removeColumn('goods_receipts', 'delivery_notes');
  }
};
