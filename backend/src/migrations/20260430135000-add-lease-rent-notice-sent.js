'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('leases', 'rent_increase_notice_sent_at', {
      type: Sequelize.DATE,
      allowNull: true
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('leases', 'rent_increase_notice_sent_at');
  }
};
