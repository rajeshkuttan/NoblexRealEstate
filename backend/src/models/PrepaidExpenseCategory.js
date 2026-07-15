const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PrepaidExpenseCategory = sequelize.define(
  'PrepaidExpenseCategory',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'company_id',
      references: { model: 'company_settings', key: 'id' },
    },
    categoryCode: { type: DataTypes.STRING(50), allowNull: false, field: 'category_code' },
    categoryName: { type: DataTypes.STRING(200), allowNull: false, field: 'category_name' },
    description: { type: DataTypes.TEXT, allowNull: true },
    defaultPrepaidAssetAccountId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'default_prepaid_asset_account_id',
      references: { model: 'chart_of_accounts', key: 'id' },
    },
    defaultExpenseAccountId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'default_expense_account_id',
      references: { model: 'chart_of_accounts', key: 'id' },
    },
    recognitionMethod: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'DAILY_CALENDAR_MONTH',
      field: 'recognition_method',
    },
    postingMode: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'AUTO_CREATE_DRAFT_JV',
      field: 'posting_mode',
    },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'updated_by' },
    deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
  },
  {
    tableName: 'prepaid_expense_categories',
    timestamps: true,
    paranoid: true,
    underscored: true,
    deletedAt: 'deleted_at',
  }
);

module.exports = PrepaidExpenseCategory;
