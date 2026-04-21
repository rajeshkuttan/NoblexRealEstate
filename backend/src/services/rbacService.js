const { Op } = require("sequelize");
const { Role, Permission, RolePermission, UserRole } = require("../models");
const { SYSTEM_ROLE_PERMISSIONS, PERMISSION_DEFINITIONS } = require("../config/permissions");

const normalizeLegacyRole = (legacyRole) => {
  if (!legacyRole || typeof legacyRole !== "string") return null;
  return legacyRole
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_");
};

const ensureUserRoleMapping = async (user) => {
  if (!user?.id) return;

  const existing = await UserRole.findOne({ where: { userId: user.id } });
  if (existing) return;

  const legacyRoleKey = normalizeLegacyRole(user.role);
  if (!legacyRoleKey) return;

  const role = await Role.findOne({ where: { key: legacyRoleKey } });
  if (!role) return;

  await UserRole.create({ userId: user.id, roleId: role.id });
};

const getUserRoles = async (user) => {
  if (!user?.id) return [];

  await ensureUserRoleMapping(user);

  const rows = await UserRole.findAll({
    where: { userId: user.id },
    // Include inactive roles so assigned role id/key stay in sync with user_roles for admin UI
    include: [{ model: Role, as: "role", required: true }],
  });

  return rows.map((row) => row.role).filter(Boolean);
};

const getRolePermissions = async (roleIds) => {
  if (!Array.isArray(roleIds) || roleIds.length === 0) return [];

  const rows = await RolePermission.findAll({
    where: { roleId: { [Op.in]: roleIds } },
    include: [{ model: Permission, as: "permission", required: true, where: { isActive: true } }],
  });

  return rows.map((row) => row.permission).filter(Boolean);
};

const getUserEffectivePermissions = async (user) => {
  try {
    const roles = await getUserRoles(user);
    const roleIds = roles.map((role) => role.id);
    const permissions = await getRolePermissions(roleIds);
    const permissionCodes = [...new Set(permissions.map((permission) => permission.code))];

    if (roles.length > 0) {
      let merged = [...permissionCodes];

      const hasAdminSystemRole = roles.some((r) => normalizeLegacyRole(r.key) === "admin");
      if (hasAdminSystemRole) {
        const adminCodes = SYSTEM_ROLE_PERMISSIONS.admin || [];
        merged = [...new Set([...merged, ...adminCodes])];
      } else if (merged.length === 0) {
        for (const role of roles) {
          const rk = normalizeLegacyRole(role.key);
          const fallback = rk && SYSTEM_ROLE_PERMISSIONS[rk];
          if (Array.isArray(fallback) && fallback.length > 0) {
            merged = [...new Set([...merged, ...fallback])];
          }
        }
      }

      return {
        roles: roles.map((role) => ({
          id: role.id,
          name: role.name,
          key: role.key,
          isSystem: !!role.isSystem,
          isActive: !!role.isActive,
        })),
        permissions: merged,
      };
    }
  } catch (error) {
    console.warn("RBAC lookup fallback to legacy role:", error.message);
  }

  const legacyRoleKey = normalizeLegacyRole(user?.role) || "viewer";
  const legacyPermissions = SYSTEM_ROLE_PERMISSIONS[legacyRoleKey] || [];

  return {
    roles: [
      {
        id: 0,
        name: legacyRoleKey.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
        key: legacyRoleKey,
        isSystem: true,
        isActive: true,
      },
    ],
    permissions: [...legacyPermissions],
  };
};

const assignUserRole = async (userId, roleId) => {
  await UserRole.destroy({ where: { userId } });
  await UserRole.create({ userId, roleId });
};

const updateRolePermissions = async (roleId, permissionIds) => {
  await RolePermission.destroy({ where: { roleId } });
  if (Array.isArray(permissionIds) && permissionIds.length > 0) {
    await RolePermission.bulkCreate(
      permissionIds.map((permissionId) => ({ roleId, permissionId })),
      { ignoreDuplicates: true },
    );
  }
};

/** Inserts any missing rows so the permissions table matches config (migration may have been skipped). */
const syncPermissionDefinitionsFromConfig = async () => {
  const existing = await Permission.findAll({ attributes: ["code"] });
  const have = new Set(existing.map((row) => row.code));
  const missing = PERMISSION_DEFINITIONS.filter((d) => !have.has(d.code));
  if (missing.length === 0) return;

  await Permission.bulkCreate(
    missing.map((d) => ({
      module: d.module,
      page: d.page,
      action: d.action,
      code: d.code,
      description: d.description || null,
      isActive: true,
    })),
    { ignoreDuplicates: true },
  );
};

module.exports = {
  getUserEffectivePermissions,
  getUserRoles,
  assignUserRole,
  updateRolePermissions,
  syncPermissionDefinitionsFromConfig,
};
