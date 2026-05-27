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

const PayrollPayslip = sequelize.define(
  'PayrollPayslip',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    payrollRunEmployeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'payroll_run_employee_id' },
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    payrollPeriodId: { type: DataTypes.INTEGER, allowNull: true, field: 'payroll_period_id' },
    payslipNumber: { type: DataTypes.STRING(50), allowNull: false, field: 'payslip_number' },
    grossSalary: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'gross_salary' },
    deductions: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    netSalary: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'net_salary' },
    generatedAt: { type: DataTypes.DATE, allowNull: true, field: 'generated_at' },
    generatedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'generated_by' },
    status: {
      type: DataTypes.ENUM('DRAFT', 'GENERATED', 'PUBLISHED', 'VOID'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    pdfPath: { type: DataTypes.STRING(500), allowNull: true, field: 'pdf_path' },
    documentSnapshot: { type: DataTypes.JSON, allowNull: true, field: 'document_snapshot' },
  },
  modelOpts('payroll_payslips')
);

const PayrollExport = sequelize.define(
  'PayrollExport',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    exportType: { type: DataTypes.STRING(80), allowNull: false, field: 'export_type' },
    format: { type: DataTypes.ENUM('pdf', 'xlsx', 'csv'), allowNull: false },
    filePath: { type: DataTypes.STRING(500), allowNull: true, field: 'file_path' },
    parameters: { type: DataTypes.JSON, allowNull: true },
    generatedAt: { type: DataTypes.DATE, allowNull: false, field: 'generated_at' },
    generatedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'generated_by' },
  },
  modelOpts('payroll_exports')
);

const PayrollDocumentDistributionQueue = sequelize.define(
  'PayrollDocumentDistributionQueue',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    channel: { type: DataTypes.ENUM('EMAIL'), allowNull: false, defaultValue: 'EMAIL' },
    status: {
      type: DataTypes.ENUM('PENDING', 'READY', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    recipientEmail: { type: DataTypes.STRING(255), allowNull: true, field: 'recipient_email' },
    recipientName: { type: DataTypes.STRING(255), allowNull: true, field: 'recipient_name' },
    documentRefs: { type: DataTypes.JSON, allowNull: true, field: 'document_refs' },
  },
  modelOpts('payroll_document_distribution_queue')
);

const PayrollBatchJob = sequelize.define(
  'PayrollBatchJob',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    jobType: { type: DataTypes.STRING(50), allowNull: false, field: 'job_type' },
    payrollRunId: { type: DataTypes.INTEGER, allowNull: true, field: 'payroll_run_id' },
    total: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    processed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    status: {
      type: DataTypes.ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    errorMessage: { type: DataTypes.TEXT, allowNull: true, field: 'error_message' },
  },
  modelOpts('payroll_batch_jobs')
);

function wireP7Associations({ Employee, PayrollRunEmployee, PayrollRun }) {
  PayrollPayslip.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
  PayrollPayslip.belongsTo(PayrollRunEmployee, { foreignKey: 'payrollRunEmployeeId', as: 'runEmployee' });
  if (PayrollRunEmployee) {
    PayrollRunEmployee.hasMany(PayrollPayslip, { foreignKey: 'payrollRunEmployeeId', as: 'payslips' });
  }
  if (PayrollRun) {
    PayrollBatchJob.belongsTo(PayrollRun, { foreignKey: 'payrollRunId', as: 'payrollRun' });
  }
}

module.exports = {
  PayrollPayslip,
  PayrollExport,
  PayrollDocumentDistributionQueue,
  PayrollBatchJob,
  wireP7Associations,
};
