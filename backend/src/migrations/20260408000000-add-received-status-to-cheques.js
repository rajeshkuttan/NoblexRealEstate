'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('cheques', 'status', {
      type: Sequelize.ENUM('pending', 'received', 'deposited', 'cleared', 'bounced', 'cancelled', 'replaced'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Cheque status'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('cheques', 'status', {
      type: Sequelize.ENUM('pending', 'deposited', 'cleared', 'bounced', 'cancelled', 'replaced'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Cheque status'
    });
  }
};
