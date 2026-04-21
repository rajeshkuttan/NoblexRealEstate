const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Permission = sequelize.define(
  "Permission",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    module: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    page: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(180),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
  },
  {
    tableName: "permissions",
    timestamps: true,
    underscored: true,
  },
);

module.exports = Permission;
