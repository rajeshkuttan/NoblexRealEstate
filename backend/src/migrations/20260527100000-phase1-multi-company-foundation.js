'use strict';

/** @param {import('sequelize').QueryInterface} queryInterface */
async function getDefaultCompanyId(queryInterface) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT id FROM company_settings WHERE is_active = 1 ORDER BY id ASC LIMIT 1`
  );
  if (rows && rows.length > 0) {
    return rows[0].id;
  }

  const now = new Date();
  await queryInterface.bulkInsert('company_settings', [
    {
      company_name: 'Default Company',
      currency: 'AED',
      timezone: 'Asia/Dubai',
      language: 'en',
      country: 'UAE',
      is_active: 1,
      contract_terminology: 'Ejari',
      created_at: now,
      updated_at: now,
    },
  ]);

  const [created] = await queryInterface.sequelize.query(
    `SELECT id FROM company_settings ORDER BY id DESC LIMIT 1`
  );
  return created[0].id;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const defaultCompanyId = await getDefaultCompanyId(queryInterface);

    await queryInterface.createTable('company_users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'company_settings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      role_in_company: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('company_users', ['company_id'], {
      name: 'idx_company_users_company_id',
    });
    await queryInterface.addIndex('company_users', ['user_id'], {
      name: 'idx_company_users_user_id',
    });
    await queryInterface.addIndex('company_users', ['user_id', 'is_default'], {
      name: 'idx_company_users_user_default',
    });
    await queryInterface.addConstraint('company_users', {
      fields: ['company_id', 'user_id'],
      type: 'unique',
      name: 'uq_company_users_company_user',
    });

    const portfolioTables = ['properties', 'units', 'tenants', 'leases'];
    for (const table of portfolioTables) {
      await queryInterface.addColumn(table, 'company_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'company_settings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
      await queryInterface.sequelize.query(
        `UPDATE \`${table}\` SET company_id = :companyId WHERE company_id IS NULL`,
        { replacements: { companyId: defaultCompanyId } }
      );
      await queryInterface.changeColumn(table, 'company_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'company_settings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
      await queryInterface.addIndex(table, ['company_id'], {
        name: `idx_${table}_company_id`,
      });
    }

    const [users] = await queryInterface.sequelize.query(`SELECT id FROM users`);
    const now = new Date();
    if (users && users.length > 0) {
      await queryInterface.bulkInsert(
        'company_users',
        users.map((u) => ({
          company_id: defaultCompanyId,
          user_id: u.id,
          role_in_company: null,
          is_default: true,
          is_active: true,
          created_at: now,
          updated_at: now,
        }))
      );
    }
  },

  async down(queryInterface) {
    const portfolioTables = ['properties', 'units', 'tenants', 'leases'];
    for (const table of portfolioTables) {
      await queryInterface.removeIndex(table, `idx_${table}_company_id`).catch(() => {});
      await queryInterface.removeColumn(table, 'company_id');
    }
    await queryInterface.dropTable('company_users');
  },
};
