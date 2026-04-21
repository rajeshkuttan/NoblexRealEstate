'use strict';

const { PERMISSION_DEFINITIONS, SYSTEM_ROLE_PERMISSIONS } = require('../config/permissions');

const SYSTEM_ROLE_NAMES = [
  'admin',
  'manager',
  'agent',
  'finance_manager',
  'finance_executive',
  'operations_executive',
  'maintenance_contractor',
  'tenant',
  'viewer',
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableNames = await queryInterface.showAllTables();
    const normalized = tableNames.map((name) => (typeof name === 'string' ? name : name.tableName || name.TABLE_NAME));

    if (!normalized.includes('roles')) {
      await queryInterface.createTable('roles', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING(120), allowNull: false },
        key: { type: Sequelize.STRING(120), allowNull: false, unique: true },
        description: { type: Sequelize.STRING(255), allowNull: true },
        is_system: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });
    }

    if (!normalized.includes('permissions')) {
      await queryInterface.createTable('permissions', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        module: { type: Sequelize.STRING(80), allowNull: false },
        page: { type: Sequelize.STRING(80), allowNull: false },
        action: { type: Sequelize.STRING(40), allowNull: false },
        code: { type: Sequelize.STRING(180), allowNull: false, unique: true },
        description: { type: Sequelize.STRING(255), allowNull: true },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });
    }

    if (!normalized.includes('role_permissions')) {
      await queryInterface.createTable('role_permissions', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        role_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'roles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        permission_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'permissions', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });
    }

    if (!normalized.includes('user_roles')) {
      await queryInterface.createTable('user_roles', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        role_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'roles', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });
    }

    await queryInterface.addIndex('roles', ['key'], { name: 'roles_key_unique', unique: true }).catch(() => {});
    await queryInterface.addIndex('permissions', ['code'], { name: 'permissions_code_unique', unique: true }).catch(() => {});
    await queryInterface.addIndex('permissions', ['module', 'action'], { name: 'permissions_module_action_idx' }).catch(() => {});
    await queryInterface.addIndex('role_permissions', ['role_id', 'permission_id'], { name: 'role_permissions_role_permission_unique', unique: true }).catch(() => {});
    await queryInterface.addIndex('user_roles', ['user_id', 'role_id'], { name: 'user_roles_user_role_unique', unique: true }).catch(() => {});

    const [existingRoles] = await queryInterface.sequelize.query('SELECT id, `key` FROM roles');
    const roleKeyToId = {};
    existingRoles.forEach((row) => {
      roleKeyToId[row.key] = row.id;
    });

    for (const roleKey of SYSTEM_ROLE_NAMES) {
      if (!roleKeyToId[roleKey]) {
        const [result] = await queryInterface.sequelize.query(
          'INSERT INTO roles (name, `key`, description, is_system, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
          {
            replacements: [
              roleKey.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
              roleKey,
              `System role: ${roleKey}`,
              true,
              true,
            ],
          },
        );
        roleKeyToId[roleKey] = result.insertId;
      }
    }

    const [existingPermissions] = await queryInterface.sequelize.query('SELECT id, code FROM permissions');
    const permissionCodeToId = {};
    existingPermissions.forEach((row) => {
      permissionCodeToId[row.code] = row.id;
    });

    for (const permission of PERMISSION_DEFINITIONS) {
      if (!permissionCodeToId[permission.code]) {
        const [result] = await queryInterface.sequelize.query(
          'INSERT INTO permissions (module, page, action, code, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
          {
            replacements: [
              permission.module,
              permission.page,
              permission.action,
              permission.code,
              permission.description,
              true,
            ],
          },
        );
        permissionCodeToId[permission.code] = result.insertId;
      }
    }

    for (const [roleKey, permissionCodes] of Object.entries(SYSTEM_ROLE_PERMISSIONS)) {
      const roleId = roleKeyToId[roleKey];
      if (!roleId) continue;
      for (const permissionCode of permissionCodes) {
        const permissionId = permissionCodeToId[permissionCode];
        if (!permissionId) continue;
        await queryInterface.sequelize.query(
          'INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
          { replacements: [roleId, permissionId] },
        );
      }
    }

    await queryInterface.sequelize.query(
      `INSERT IGNORE INTO user_roles (user_id, role_id, created_at, updated_at)
       SELECT u.id, r.id, NOW(), NOW()
       FROM users u
       INNER JOIN roles r ON r.key = u.role
       WHERE u.role IS NOT NULL`,
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('user_roles');
    await queryInterface.dropTable('role_permissions');
    await queryInterface.dropTable('permissions');
    await queryInterface.dropTable('roles');
  },
};
