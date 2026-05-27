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

const PayrollPeriod = sequelize.define(
  'PayrollPeriod',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    attendancePeriodId: { type: DataTypes.INTEGER, allowNull: true, field: 'attendance_period_id' },
    periodMonth: { type: DataTypes.INTEGER, allowNull: false, field: 'period_month' },
    periodYear: { type: DataTypes.INTEGER, allowNull: false, field: 'period_year' },
    fromDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'from_date' },
    toDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'to_date' },
    status: {
      type: DataTypes.ENUM('OPEN', 'GENERATED', 'UNDER_REVIEW', 'APPROVED', 'LOCKED'),
      allowNull: false,
      defaultValue: 'OPEN',
    },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
    generatedAt: { type: DataTypes.DATE, allowNull: true, field: 'generated_at' },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
    lockedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'locked_by' },
    lockedAt: { type: DataTypes.DATE, allowNull: true, field: 'locked_at' },
  },
  modelOpts('payroll_periods')
);

const PayrollRun = sequelize.define(
  'PayrollRun',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    payrollPeriodId: { type: DataTypes.INTEGER, allowNull: false, field: 'payroll_period_id' },
    runNumber: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, field: 'run_number' },
    runType: {
      type: DataTypes.ENUM('REGULAR', 'SUPPLEMENTARY', 'ADJUSTMENT', 'FINAL'),
      allowNull: false,
      defaultValue: 'REGULAR',
      field: 'run_type',
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'CALCULATED', 'UNDER_REVIEW', 'APPROVED', 'LOCKED', 'REVERSED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    totalEmployees: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'total_employees' },
    totalGross: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'total_gross' },
    totalDeductions: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'total_deductions' },
    totalNet: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'total_net' },
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
  modelOpts('payroll_runs')
);

const PayrollRunEmployee = sequelize.define(
  'PayrollRunEmployee',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    payrollRunId: { type: DataTypes.INTEGER, allowNull: false, field: 'payroll_run_id' },
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    salaryStructureSnapshot: { type: DataTypes.JSON, allowNull: true, field: 'salary_structure_snapshot' },
    attendanceSnapshot: { type: DataTypes.JSON, allowNull: true, field: 'attendance_snapshot' },
    payableDays: { type: DataTypes.DECIMAL(8, 2), allowNull: true, field: 'payable_days' },
    workingDays: { type: DataTypes.DECIMAL(8, 2), allowNull: true, field: 'working_days' },
    grossSalary: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'gross_salary' },
    deductions: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'deductions' },
    netSalary: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'net_salary' },
    status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'CALCULATED' },
  },
  modelOpts('payroll_run_employees')
);

const PayrollRunComponentLine = sequelize.define(
  'PayrollRunComponentLine',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    payrollRunEmployeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'payroll_run_employee_id' },
    componentId: { type: DataTypes.INTEGER, allowNull: true, field: 'component_id' },
    componentType: {
      type: DataTypes.ENUM('EARNING', 'DEDUCTION', 'EMPLOYER', 'PROVISION'),
      allowNull: false,
      field: 'component_type',
    },
    calculationMethod: { type: DataTypes.STRING(50), allowNull: true, field: 'calculation_method' },
    calculatedAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0, field: 'calculated_amount' },
    baseAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: true, field: 'base_amount' },
    formulaSnapshot: { type: DataTypes.JSON, allowNull: true, field: 'formula_snapshot' },
  },
  { tableName: 'payroll_run_component_lines', timestamps: true, createdAt: 'created_at', updatedAt: false, underscored: true }
);

const PayrollMonthlyAdjustment = sequelize.define(
  'PayrollMonthlyAdjustment',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    payrollPeriodId: { type: DataTypes.INTEGER, allowNull: false, field: 'payroll_period_id' },
    adjustmentType: {
      type: DataTypes.ENUM('ADDITION', 'DEDUCTION'),
      allowNull: false,
      field: 'adjustment_type',
    },
    componentId: { type: DataTypes.INTEGER, allowNull: true, field: 'component_id' },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
  },
  modelOpts('payroll_monthly_adjustments')
);

const EmployeeLoan = sequelize.define(
  'EmployeeLoan',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    loanAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, field: 'loan_amount' },
    monthlyInstallment: { type: DataTypes.DECIMAL(15, 2), allowNull: false, field: 'monthly_installment' },
    balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    startPeriodMonth: { type: DataTypes.INTEGER, allowNull: false, field: 'start_period_month' },
    startPeriodYear: { type: DataTypes.INTEGER, allowNull: false, field: 'start_period_year' },
    endPeriodMonth: { type: DataTypes.INTEGER, allowNull: true, field: 'end_period_month' },
    endPeriodYear: { type: DataTypes.INTEGER, allowNull: true, field: 'end_period_year' },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'CLOSED', 'HOLD'),
      allowNull: false,
      defaultValue: 'ACTIVE',
    },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
  },
  modelOpts('employee_loans')
);

const EmployeeLoanInstallment = sequelize.define(
  'EmployeeLoanInstallment',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    loanId: { type: DataTypes.INTEGER, allowNull: false, field: 'loan_id' },
    duePeriodMonth: { type: DataTypes.INTEGER, allowNull: false, field: 'due_period_month' },
    duePeriodYear: { type: DataTypes.INTEGER, allowNull: false, field: 'due_period_year' },
    installmentAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, field: 'installment_amount' },
    status: {
      type: DataTypes.ENUM('PENDING', 'APPROVED', 'DEDUCTED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'PENDING',
    },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
  },
  modelOpts('employee_loan_installments')
);

function wireP3Associations({
  Employee,
  PayrollComponent,
  PayrollAttendancePeriod,
  EmployeeSalaryStructure,
}) {
  PayrollPeriod.belongsTo(PayrollAttendancePeriod, { foreignKey: 'attendancePeriodId', as: 'attendancePeriod' });
  PayrollPeriod.hasMany(PayrollRun, { foreignKey: 'payrollPeriodId', as: 'runs' });
  PayrollPeriod.hasMany(PayrollMonthlyAdjustment, { foreignKey: 'payrollPeriodId', as: 'adjustments' });

  PayrollRun.belongsTo(PayrollPeriod, { foreignKey: 'payrollPeriodId', as: 'payrollPeriod' });
  PayrollRun.hasMany(PayrollRunEmployee, { foreignKey: 'payrollRunId', as: 'employees' });

  PayrollRunEmployee.belongsTo(PayrollRun, { foreignKey: 'payrollRunId', as: 'payrollRun' });
  PayrollRunEmployee.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
  PayrollRunEmployee.hasMany(PayrollRunComponentLine, { foreignKey: 'payrollRunEmployeeId', as: 'lines' });

  PayrollRunComponentLine.belongsTo(PayrollRunEmployee, { foreignKey: 'payrollRunEmployeeId', as: 'runEmployee' });
  PayrollRunComponentLine.belongsTo(PayrollComponent, { foreignKey: 'componentId', as: 'component' });

  PayrollMonthlyAdjustment.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
  PayrollMonthlyAdjustment.belongsTo(PayrollPeriod, { foreignKey: 'payrollPeriodId', as: 'payrollPeriod' });
  PayrollMonthlyAdjustment.belongsTo(PayrollComponent, { foreignKey: 'componentId', as: 'component' });

  EmployeeLoan.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
  EmployeeLoan.hasMany(EmployeeLoanInstallment, { foreignKey: 'loanId', as: 'installments' });
  EmployeeLoanInstallment.belongsTo(EmployeeLoan, { foreignKey: 'loanId', as: 'loan' });
}

module.exports = {
  PayrollPeriod,
  PayrollRun,
  PayrollRunEmployee,
  PayrollRunComponentLine,
  PayrollMonthlyAdjustment,
  EmployeeLoan,
  EmployeeLoanInstallment,
  wireP3Associations,
};
