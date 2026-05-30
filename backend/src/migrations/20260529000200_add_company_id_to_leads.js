'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('leads');

    if (!table.company_id) {
      await queryInterface.addColumn('leads', 'company_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'company_settings',
          key: 'id',
        },
      });
    }

    const [companies] = await queryInterface.sequelize.query(
      'SELECT id FROM company_settings ORDER BY id ASC'
    );
    const fallbackCompanyId = companies?.[0]?.id || null;

    if (fallbackCompanyId) {
      await queryInterface.sequelize.query(
        `UPDATE leads SET company_id = ${Number(fallbackCompanyId)} WHERE company_id IS NULL`
      );
    }

    await queryInterface.changeColumn('leads', 'company_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'company_settings',
        key: 'id',
      },
    });

    await queryInterface.addIndex('leads', ['company_id'], {
      name: 'idx_leads_company_id',
    }).catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('leads', 'idx_leads_company_id').catch(() => {});
    const table = await queryInterface.describeTable('leads');
    if (table.company_id) {
      await queryInterface.removeColumn('leads', 'company_id');
    }
  },
};
