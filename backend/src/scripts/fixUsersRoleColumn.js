/**
 * One-off: ALTER users.role to VARCHAR(120) when ENUM blocks dynamic RBAC keys
 * and pending migrations are blocked (e.g. RBAC migration collation failure).
 */
require("dotenv").config({ path: "./config.env" });
const { sequelize } = require("../models");

(async () => {
  try {
    await sequelize.authenticate();
    const dialect = sequelize.getDialect();
    if (dialect === "mysql" || dialect === "mariadb") {
      await sequelize.query(
        "ALTER TABLE `users` MODIFY COLUMN `role` VARCHAR(120) NOT NULL DEFAULT 'agent'"
      );
      console.log("OK: users.role is VARCHAR(120)");
    } else {
      await sequelize.getQueryInterface().changeColumn("users", "role", {
        type: sequelize.Sequelize.STRING(120),
        allowNull: false,
        defaultValue: "agent",
      });
      console.log("OK: users.role changed for non-MySQL dialect");
    }
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();
