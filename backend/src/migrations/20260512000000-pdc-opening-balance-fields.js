'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cheques', 'is_opening_balance', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Imported as legacy opening PDC (no GL on import)',
    });
    await queryInterface.addColumn('cheques', 'gl_deposit_posted', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Deposit GL entries have been posted',
    });
    await queryInterface.addColumn('accounts_trans', 'cheque_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'cheques', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Link to cheque for PDC deposit posting',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('accounts_trans', 'cheque_id');
    await queryInterface.removeColumn('cheques', 'gl_deposit_posted');
    await queryInterface.removeColumn('cheques', 'is_opening_balance');
  },
};
