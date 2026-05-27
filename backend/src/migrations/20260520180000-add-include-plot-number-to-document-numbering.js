'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('document_numbering');
    if (!table.include_plot_number) {
      await queryInterface.addColumn('document_numbering', 'include_plot_number', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('document_numbering', 'include_plot_number');
  },
};
