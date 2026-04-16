'use strict';

/**
 * Add optional tenant fields: account code, building no, PO box, telephone, fax, VAT TRN (15 digits).
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('tenants', 'account_code', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn('tenants', 'building_no', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn('tenants', 'po_box', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.addColumn('tenants', 'telephone', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.addColumn('tenants', 'fax', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.addColumn('tenants', 'vat_reg_no', {
      type: Sequelize.STRING(15),
      allowNull: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('tenants', 'account_code');
    await queryInterface.removeColumn('tenants', 'building_no');
    await queryInterface.removeColumn('tenants', 'po_box');
    await queryInterface.removeColumn('tenants', 'telephone');
    await queryInterface.removeColumn('tenants', 'fax');
    await queryInterface.removeColumn('tenants', 'vat_reg_no');
  },
};
