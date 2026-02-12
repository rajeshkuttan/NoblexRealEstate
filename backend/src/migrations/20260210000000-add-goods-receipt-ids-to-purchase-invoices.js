"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("purchase_invoices", "goods_receipt_ids", {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: [],
      comment: "List of Goods Receipt IDs associated with this invoice",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("purchase_invoices", "goods_receipt_ids");
  },
};
