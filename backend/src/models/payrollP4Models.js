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

const PayrollWpsConfiguration = sequelize.define(
  'PayrollWpsConfiguration',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    visaSponsorCompanyId: { type: DataTypes.INTEGER, allowNull: true, field: 'visa_sponsor_company_id' },
    agentName: { type: DataTypes.STRING(200), allowNull: true, field: 'agent_name' },
    agentCode: { type: DataTypes.STRING(50), allowNull: true, field: 'agent_code' },
    molEstablishmentId: { type: DataTypes.STRING(100), allowNull: true, field: 'mol_establishment_id' },
    molCompanyCode: { type: DataTypes.STRING(50), allowNull: true, field: 'mol_company_code' },
    payerBankName: { type: DataTypes.STRING(200), allowNull: true, field: 'payer_bank_name' },
    payerBankAccount: { type: DataTypes.STRING(50), allowNull: true, field: 'payer_bank_account' },
    payerBankIban: { type: DataTypes.STRING(50), allowNull: true, field: 'payer_bank_iban' },
    salaryCurrency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'AED', field: 'salary_currency' },
    defaultSalaryType: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'BASIC', field: 'default_salary_type' },
    status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), allowNull: false, defaultValue: 'ACTIVE' },
  },
  modelOpts('payroll_wps_configurations')
);

const PayrollWpsBatch = sequelize.define(
  'PayrollWpsBatch',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    payrollRunId: { type: DataTypes.INTEGER, allowNull: false, field: 'payroll_run_id' },
    batchNumber: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, field: 'batch_number' },
    salaryMonth: { type: DataTypes.INTEGER, allowNull: false, field: 'salary_month' },
    salaryYear: { type: DataTypes.INTEGER, allowNull: false, field: 'salary_year' },
    totalEmployees: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'total_employees' },
    totalAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'total_amount' },
    status: {
      type: DataTypes.ENUM('DRAFT', 'GENERATED', 'UNDER_REVIEW', 'APPROVED', 'EXPORTED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    generatedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'generated_by' },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
    exportedAt: { type: DataTypes.DATE, allowNull: true, field: 'exported_at' },
    financeClearingStatus: {
      type: DataTypes.ENUM('UNPOSTED', 'POSTED', 'REVERSED'),
      allowNull: false,
      defaultValue: 'UNPOSTED',
      field: 'finance_clearing_status',
    },
    financeClearingTransactionNo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'finance_clearing_transaction_no',
    },
  },
  modelOpts('payroll_wps_batches')
);

const PayrollWpsEmployeeLine = sequelize.define(
  'PayrollWpsEmployeeLine',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    batchId: { type: DataTypes.INTEGER, allowNull: false, field: 'batch_id' },
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    employeeNo: { type: DataTypes.STRING(50), allowNull: true, field: 'employee_no' },
    employeeName: { type: DataTypes.STRING(200), allowNull: true, field: 'employee_name' },
    labourCardNo: { type: DataTypes.STRING(50), allowNull: true, field: 'labour_card_no' },
    iban: { type: DataTypes.STRING(50), allowNull: true },
    salaryAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'salary_amount' },
    salaryType: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'BASIC', field: 'salary_type' },
    remarks: { type: DataTypes.STRING(255), allowNull: true },
    validationStatus: {
      type: DataTypes.ENUM('VALID', 'WARNING', 'ERROR'),
      allowNull: false,
      defaultValue: 'VALID',
      field: 'validation_status',
    },
  },
  { tableName: 'payroll_wps_employee_lines', timestamps: true, createdAt: 'created_at', updatedAt: false, underscored: true }
);

const PayrollWpsSifExport = sequelize.define(
  'PayrollWpsSifExport',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    batchId: { type: DataTypes.INTEGER, allowNull: false, field: 'batch_id' },
    fileName: { type: DataTypes.STRING(255), allowNull: false, field: 'file_name' },
    sifContent: { type: DataTypes.TEXT('long'), allowNull: true, field: 'sif_content' },
    employeeCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'employee_count' },
    totalAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'total_amount' },
    exportedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'exported_by' },
    exportedAt: { type: DataTypes.DATE, allowNull: false, field: 'exported_at' },
  },
  modelOpts('payroll_wps_sif_exports')
);

const PayrollGpssaConfiguration = sequelize.define(
  'PayrollGpssaConfiguration',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: 'company_id' },
    employeeRate: { type: DataTypes.DECIMAL(8, 4), allowNull: false, defaultValue: 0, field: 'employee_rate' },
    employerRate: { type: DataTypes.DECIMAL(8, 4), allowNull: false, defaultValue: 0, field: 'employer_rate' },
    governmentRate: { type: DataTypes.DECIMAL(8, 4), allowNull: false, defaultValue: 0, field: 'government_rate' },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  modelOpts('payroll_gpssa_configuration')
);

function wireP4Associations({
  Employee,
  VisaSponsorCompany,
  PayrollRun,
  PayrollWpsConfiguration,
}) {
  PayrollWpsConfiguration.belongsTo(VisaSponsorCompany, { foreignKey: 'visaSponsorCompanyId', as: 'visaSponsor' });
  PayrollWpsBatch.belongsTo(PayrollRun, { foreignKey: 'payrollRunId', as: 'payrollRun' });
  PayrollWpsBatch.hasMany(PayrollWpsEmployeeLine, { foreignKey: 'batchId', as: 'lines' });
  PayrollWpsBatch.hasMany(PayrollWpsSifExport, { foreignKey: 'batchId', as: 'exports' });
  PayrollWpsEmployeeLine.belongsTo(PayrollWpsBatch, { foreignKey: 'batchId', as: 'batch' });
  PayrollWpsEmployeeLine.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
  PayrollWpsSifExport.belongsTo(PayrollWpsBatch, { foreignKey: 'batchId', as: 'batch' });
}

module.exports = {
  PayrollWpsConfiguration,
  PayrollWpsBatch,
  PayrollWpsEmployeeLine,
  PayrollWpsSifExport,
  PayrollGpssaConfiguration,
  wireP4Associations,
};
