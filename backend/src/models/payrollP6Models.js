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

const financePostingFields = {
  financePostingStatus: {
    type: DataTypes.ENUM('UNPOSTED', 'POSTED', 'REVERSED'),
    allowNull: false,
    defaultValue: 'UNPOSTED',
    field: 'finance_posting_status',
  },
  financePostedAt: { type: DataTypes.DATE, allowNull: true, field: 'finance_posted_at' },
  financeTransactionNo: { type: DataTypes.INTEGER, allowNull: true, field: 'finance_transaction_no' },
};

const PayrollAccountConfiguration = sequelize.define(
  'PayrollAccountConfiguration',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: 'company_id' },
    basicSalaryExpenseAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'basic_salary_expense_account' },
    housingExpenseAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'housing_expense_account' },
    transportExpenseAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'transport_expense_account' },
    allowanceExpenseAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'allowance_expense_account' },
    overtimeExpenseAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'overtime_expense_account' },
    payrollPayableAccount: { type: DataTypes.INTEGER, allowNull: false, field: 'payroll_payable_account' },
    loanRecoveryAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'loan_recovery_account' },
    eosExpenseAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'eos_expense_account' },
    eosProvisionAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'eos_provision_account' },
    leaveEncashmentAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'leave_encashment_account' },
    settlementPayableAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'settlement_payable_account' },
    salaryClearingAccount: { type: DataTypes.INTEGER, allowNull: true, field: 'salary_clearing_account' },
    staffCostCenterId: { type: DataTypes.INTEGER, allowNull: true, field: 'staff_cost_center_id' },
    eosAccrualEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'eos_accrual_enabled' },
    wpsClearingEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'wps_clearing_enabled' },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  modelOpts('payroll_account_configurations')
);

const EmployeeLedgerHeader = sequelize.define(
  'EmployeeLedgerHeader',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    ledgerNo: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, field: 'ledger_no' },
    status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), allowNull: false, defaultValue: 'ACTIVE' },
  },
  modelOpts('employee_ledger_headers')
);

const EmployeeLedgerLine = sequelize.define(
  'EmployeeLedgerLine',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    ledgerHeaderId: { type: DataTypes.INTEGER, allowNull: false, field: 'ledger_header_id' },
    transactionDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'transaction_date' },
    sourceType: {
      type: DataTypes.ENUM('PAYROLL', 'LOAN', 'ADVANCE', 'EOS', 'SETTLEMENT', 'ADJUSTMENT', 'PAYMENT', 'RECOVERY'),
      allowNull: false,
      field: 'source_type',
    },
    sourceId: { type: DataTypes.INTEGER, allowNull: true, field: 'source_id' },
    referenceNo: { type: DataTypes.STRING(50), allowNull: true, field: 'reference_no' },
    description: { type: DataTypes.STRING(255), allowNull: true },
    debit: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    credit: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  },
  { tableName: 'employee_ledger_lines', timestamps: true, createdAt: 'created_at', updatedAt: false, underscored: true }
);

function wireP6Associations({ Employee }) {
  Employee.hasOne(EmployeeLedgerHeader, { foreignKey: 'employeeId', as: 'ledgerHeader' });
  EmployeeLedgerHeader.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
  EmployeeLedgerHeader.hasMany(EmployeeLedgerLine, { foreignKey: 'ledgerHeaderId', as: 'lines' });
  EmployeeLedgerLine.belongsTo(EmployeeLedgerHeader, { foreignKey: 'ledgerHeaderId', as: 'header' });
}

module.exports = {
  PayrollAccountConfiguration,
  EmployeeLedgerHeader,
  EmployeeLedgerLine,
  financePostingFields,
  wireP6Associations,
};
