const { PayrollAccountConfiguration } = require('../models');
const { withCompanyId, stripCompanyFromBody } = require('../utils/companyScope');
const { assertAccountInCompany } = require('../utils/companyScope');

async function validateAccounts(req, body) {
  const accountFields = [
    'basic_salary_expense_account',
    'housing_expense_account',
    'transport_expense_account',
    'allowance_expense_account',
    'overtime_expense_account',
    'payroll_payable_account',
    'loan_recovery_account',
    'eos_expense_account',
    'eos_provision_account',
    'leave_encashment_account',
    'settlement_payable_account',
    'salary_clearing_account',
  ];
  for (const f of accountFields) {
    if (body[f] != null) await assertAccountInCompany(body[f], req);
  }
}

exports.get = async (req, res, next) => {
  try {
    const row = await PayrollAccountConfiguration.findOne({ where: { companyId: req.companyId } });
    res.json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    await validateAccounts(req, body);
    if (!body.payroll_payable_account) {
      return res.status(400).json({ message: 'payroll_payable_account is required' });
    }

    let row = await PayrollAccountConfiguration.findOne({ where: { companyId: req.companyId } });
    const payload = {
      basicSalaryExpenseAccount: body.basic_salary_expense_account,
      housingExpenseAccount: body.housing_expense_account,
      transportExpenseAccount: body.transport_expense_account,
      allowanceExpenseAccount: body.allowance_expense_account,
      overtimeExpenseAccount: body.overtime_expense_account,
      payrollPayableAccount: body.payroll_payable_account,
      loanRecoveryAccount: body.loan_recovery_account,
      eosExpenseAccount: body.eos_expense_account,
      eosProvisionAccount: body.eos_provision_account,
      leaveEncashmentAccount: body.leave_encashment_account,
      settlementPayableAccount: body.settlement_payable_account,
      salaryClearingAccount: body.salary_clearing_account,
      staffCostCenterId: body.staff_cost_center_id,
      eosAccrualEnabled: body.eos_accrual_enabled === true,
      wpsClearingEnabled: body.wps_clearing_enabled === true,
      active: body.active !== false,
    };

    if (row) {
      await row.update(payload);
    } else {
      row = await PayrollAccountConfiguration.create(withCompanyId(req, payload));
    }
    res.json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};
