/**
 * Sync permissions table + system role_permissions from config.
 * Usage: node src/scripts/sync-system-role-permissions.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../../config.env") });

const { sequelize } = require("../models");
const { syncSystemRolePermissionsFromConfig } = require("../services/rbacService");

(async () => {
  try {
    await sequelize.authenticate();
    const result = await syncSystemRolePermissionsFromConfig();
    console.log("RBAC sync complete:", result);
    process.exit(0);
  } catch (e) {
    console.error("RBAC sync failed:", e.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();
