'use strict';

const { COMPANY_SETTINGS_EXTRA_PERMISSIONS } = require('../config/permissions');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [existingPermissions] = await queryInterface.sequelize.query(
      'SELECT id, code FROM permissions'
    );
    const permissionCodeToId = {};
    existingPermissions.forEach((row) => {
      permissionCodeToId[row.code] = row.id;
    });

    for (const permission of COMPANY_SETTINGS_EXTRA_PERMISSIONS) {
      if (!permissionCodeToId[permission.code]) {
        const [result] = await queryInterface.sequelize.query(
          `INSERT INTO permissions (module, page, action, code, description, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
          {
            replacements: [
              permission.module,
              permission.page,
              permission.action,
              permission.code,
              permission.description,
            ],
          }
        );
        permissionCodeToId[permission.code] = result.insertId;
      }
    }

    const [roles] = await queryInterface.sequelize.query(
      "SELECT id, `key` FROM roles WHERE `key` = 'admin' LIMIT 1"
    );
    if (!roles.length) return;

    const adminRoleId = roles[0].id;
    for (const permission of COMPANY_SETTINGS_EXTRA_PERMISSIONS) {
      const permissionId = permissionCodeToId[permission.code];
      if (!permissionId) continue;
      const [existing] = await queryInterface.sequelize.query(
        'SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ? LIMIT 1',
        { replacements: [adminRoleId, permissionId] }
      );
      if (!existing.length) {
        await queryInterface.sequelize.query(
          'INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
          { replacements: [adminRoleId, permissionId] }
        );
      }
    }
  },

  async down(queryInterface) {
    const codes = COMPANY_SETTINGS_EXTRA_PERMISSIONS.map((p) => p.code);
    const [perms] = await queryInterface.sequelize.query(
      `SELECT id FROM permissions WHERE code IN (${codes.map(() => '?').join(',')})`,
      { replacements: codes }
    );
    const ids = perms.map((p) => p.id);
    if (ids.length) {
      await queryInterface.sequelize.query(
        `DELETE FROM role_permissions WHERE permission_id IN (${ids.map(() => '?').join(',')})`,
        { replacements: ids }
      );
      await queryInterface.sequelize.query(
        `DELETE FROM permissions WHERE id IN (${ids.map(() => '?').join(',')})`,
        { replacements: ids }
      );
    }
  },
};
