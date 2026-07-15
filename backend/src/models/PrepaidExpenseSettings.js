const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DEFAULT_SETTINGS_JSON = {
  posting_mode: 'AUTO_CREATE_DRAFT_JV',
  recognition_method: 'DAILY_CALENDAR_MONTH',
  tolerance: { amount: 0.01, reconciliation: 1.0 },
  scheduler_enabled: false,
  maker_checker_enforced: true,
};

const PrepaidExpenseSettings = sequelize.define(
  'PrepaidExpenseSettings',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: 'company_id',
      references: { model: 'company_settings', key: 'id' },
    },
    defaultPostingMode: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'AUTO_CREATE_DRAFT_JV',
      field: 'default_posting_mode',
    },
    defaultRecognitionMethod: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: 'DAILY_CALENDAR_MONTH',
      field: 'default_recognition_method',
    },
    settingsJson: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: DEFAULT_SETTINGS_JSON,
      field: 'settings_json',
    },
  },
  {
    tableName: 'prepaid_expense_settings',
    timestamps: true,
    underscored: true,
  }
);

PrepaidExpenseSettings.DEFAULT_SETTINGS_JSON = DEFAULT_SETTINGS_JSON;

module.exports = PrepaidExpenseSettings;
