const { Role, Permission, RolePermission } = require('../models');
const { updateRolePermissions, syncPermissionDefinitionsFromConfig } = require('../services/rbacService');

const listRoles = async (req, res, next) => {
  try {
    const roles = await Role.findAll({
      include: [
        {
          model: Permission,
          as: 'permissions',
          through: { attributes: [] },
          required: false,
        },
      ],
      order: [['name', 'ASC']],
    });

    res.json({
      success: true,
      data: {
        roles: roles.map((role) => ({
          id: role.id,
          name: role.name,
          key: role.key,
          description: role.description,
          isSystem: !!role.isSystem,
          isActive: !!role.isActive,
          permissions: (role.permissions || []).map((permission) => ({
            id: permission.id,
            code: permission.code,
            module: permission.module,
            page: permission.page,
            action: permission.action,
            description: permission.description,
          })),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

const listPermissions = async (req, res, next) => {
  try {
    await syncPermissionDefinitionsFromConfig();

    const permissions = await Permission.findAll({
      where: { isActive: true },
      order: [['module', 'ASC'], ['action', 'ASC']],
    });

    res.json({
      success: true,
      data: {
        permissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createRole = async (req, res, next) => {
  try {
    const { name, key, description, permissionIds } = req.body;
    if (!name || !key) {
      return res.status(400).json({
        success: false,
        message: 'Role name and key are required',
      });
    }

    const normalizedKey = String(key).trim().toLowerCase();
    const existing = await Role.findOne({ where: { key: normalizedKey } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Role key already exists',
      });
    }

    const role = await Role.create({
      name: String(name).trim(),
      key: normalizedKey,
      description: description ? String(description).trim() : null,
      isSystem: false,
      isActive: true,
    });

    await updateRolePermissions(role.id, Array.isArray(permissionIds) ? permissionIds : []);

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: { role },
    });
  } catch (error) {
    next(error);
  }
};

const updateRole = async (req, res, next) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    const { name, key, description, isActive, permissionIds } = req.body;
    const nextKey = key ? String(key).trim().toLowerCase() : role.key;
    if (nextKey !== role.key) {
      const duplicate = await Role.findOne({ where: { key: nextKey } });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Role key already exists',
        });
      }
    }

    await role.update({
      name: name !== undefined ? String(name).trim() : role.name,
      key: nextKey,
      description: description !== undefined ? String(description).trim() : role.description,
      isActive: typeof isActive === 'boolean' ? isActive : role.isActive,
    });

    if (Array.isArray(permissionIds)) {
      await updateRolePermissions(role.id, permissionIds);
    }

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: { role },
    });
  } catch (error) {
    next(error);
  }
};

const deleteRole = async (req, res, next) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    if (role.isSystem) {
      return res.status(400).json({
        success: false,
        message: 'System roles cannot be deleted',
      });
    }

    await RolePermission.destroy({ where: { roleId: role.id } });
    await role.destroy();

    res.json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listRoles,
  listPermissions,
  createRole,
  updateRole,
  deleteRole,
};
