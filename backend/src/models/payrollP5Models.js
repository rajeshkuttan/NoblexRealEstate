const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const companyIdField = {
  type: DataTypes.INTEGER,
  allowNull: false,
  field: 'company_id',
};

const modelOpts = (tableName) => ({
  tableName,
  timestamps: true,
  underscored: true,
});

const PayrollEosConfiguration = sequelize.define(
  'PayrollEosConfiguration',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    ruleName: { type: DataTypes.STRING(200), allowNull: false, field: 'rule_name' },
    contractType: {
      type: DataTypes.ENUM('LIMITED', 'UNLIMITED', 'ALL'),
      allowNull: false,
      defaultValue: 'ALL',
      field: 'contract_type',
    },
    minimumServiceMonths: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'minimum_service_months' },
    gratuityFormulaType: {
      type: DataTypes.ENUM('FIXED', 'RULE_BASED'),
      allowNull: false,
      defaultValue: 'RULE_BASED',
      field: 'gratuity_formula_type',
    },
    dailySalaryBasis: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'BASIC_DIV_30', field: 'daily_salary_basis' },
    fixedGratuityDays: { type: DataTypes.DECIMAL(10, 2), allowNull: true, field: 'fixed_gratuity_days' },
    fixedGratuityRate: { type: DataTypes.DECIMAL(15, 2), allowNull: true, field: 'fixed_gratuity_rate' },
    noticeRecoveryEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'notice_recovery_enabled' },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  modelOpts('payroll_eos_configurations')
);

const PayrollEosRuleTier = sequelize.define(
  'PayrollEosRuleTier',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    eosConfigurationId: { type: DataTypes.INTEGER, allowNull: false, field: 'eos_configuration_id' },
    serviceYearsFrom: { type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0, field: 'service_years_from' },
    serviceYearsTo: { type: DataTypes.DECIMAL(8, 2), allowNull: true, field: 'service_years_to' },
    gratuityDaysPerYear: { type: DataTypes.DECIMAL(8, 2), allowNull: true, field: 'gratuity_days_per_year' },
    percentOfBasic: { type: DataTypes.DECIMAL(8, 4), allowNull: true, field: 'percent_of_basic' },
    appliesToSeparationTypes: { type: DataTypes.JSON, allowNull: true, field: 'applies_to_separation_types' },
  },
  modelOpts('payroll_eos_rule_tiers')
);

const EmployeeSeparation = sequelize.define(
  'EmployeeSeparation',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    separationType: {
      type: DataTypes.ENUM('RESIGNATION', 'TERMINATION', 'RETIREMENT', 'MUTUAL', 'DEATH'),
      allowNull: false,
      field: 'separation_type',
    },
    lastWorkingDay: { type: DataTypes.DATEONLY, allowNull: false, field: 'last_working_day' },
    noticeDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'notice_days' },
    servedNoticeDays: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'served_notice_days' },
    reason: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
  },
  modelOpts('employee_separations')
);

const PayrollFinalSettlement = sequelize.define(
  'PayrollFinalSettlement',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    separationId: { type: DataTypes.INTEGER, allowNull: false, field: 'separation_id' },
    settlementNumber: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, field: 'settlement_number' },
    settlementDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'settlement_date' },
    grossSettlement: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'gross_settlement' },
    deductions: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    netSettlement: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'net_settlement' },
    calculationSnapshot: { type: DataTypes.JSON, allowNull: true, field: 'calculation_snapshot' },
    status: {
      type: DataTypes.ENUM('DRAFT', 'CALCULATED', 'UNDER_REVIEW', 'APPROVED', 'LOCKED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
    financePostingStatus: {
      type: DataTypes.ENUM('UNPOSTED', 'POSTED', 'REVERSED'),
      allowNull: false,
      defaultValue: 'UNPOSTED',
      field: 'finance_posting_status',
    },
    financePostedAt: { type: DataTypes.DATE, allowNull: true, field: 'finance_posted_at' },
    financeTransactionNo: { type: DataTypes.INTEGER, allowNull: true, field: 'finance_transaction_no' },
  },
  modelOpts('payroll_final_settlements')
);

const PayrollFinalSettlementLine = sequelize.define(
  'PayrollFinalSettlementLine',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    settlementId: { type: DataTypes.INTEGER, allowNull: false, field: 'settlement_id' },
    componentType: {
      type: DataTypes.ENUM(
        'EOSB',
        'LEAVE_ENCASHMENT',
        'SALARY_PAYABLE',
        'BONUS',
        'LOAN_RECOVERY',
        'NOTICE_RECOVERY',
        'DEDUCTION',
        'ADJUSTMENT'
      ),
      allowNull: false,
      field: 'component_type',
    },
    componentName: { type: DataTypes.STRING(200), allowNull: false, field: 'component_name' },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    calculationSource: { type: DataTypes.JSON, allowNull: true, field: 'calculation_source' },
    remarks: { type: DataTypes.STRING(255), allowNull: true },
  },
  { tableName: 'payroll_final_settlement_lines', timestamps: true, createdAt: 'created_at', updatedAt: false, underscored: true }
);

function wireP5Associations({ Employee }) {
  PayrollEosConfiguration.hasMany(PayrollEosRuleTier, { foreignKey: 'eosConfigurationId', as: 'tiers' });
  PayrollEosRuleTier.belongsTo(PayrollEosConfiguration, { foreignKey: 'eosConfigurationId', as: 'configuration' });

  Employee.hasMany(EmployeeSeparation, { foreignKey: 'employeeId', as: 'separations' });
  EmployeeSeparation.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

  EmployeeSeparation.hasMany(PayrollFinalSettlement, { foreignKey: 'separationId', as: 'settlements' });
  PayrollFinalSettlement.belongsTo(EmployeeSeparation, { foreignKey: 'separationId', as: 'separation' });
  PayrollFinalSettlement.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

  PayrollFinalSettlement.hasMany(PayrollFinalSettlementLine, { foreignKey: 'settlementId', as: 'lines' });
  PayrollFinalSettlementLine.belongsTo(PayrollFinalSettlement, { foreignKey: 'settlementId', as: 'settlement' });
}

module.exports = {
  PayrollEosConfiguration,
  PayrollEosRuleTier,
  EmployeeSeparation,
  PayrollFinalSettlement,
  PayrollFinalSettlementLine,
  wireP5Associations,
};
