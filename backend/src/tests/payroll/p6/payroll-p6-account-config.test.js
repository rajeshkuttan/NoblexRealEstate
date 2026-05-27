jest.mock('../../../models', () => ({
  PayrollAccountConfiguration: { findOne: jest.fn(), create: jest.fn() },
}));

jest.mock('../../../utils/companyScope', () => ({
  withCompanyId: (req, data) => ({ ...data, companyId: req.companyId }),
  stripCompanyFromBody: (b) => b,
  assertAccountInCompany: jest.fn(),
}));

const { PayrollAccountConfiguration } = require('../../../models');
const configCtrl = require('../../../controllers/payrollAccountConfigController');

describe('payroll account configuration', () => {
  test('one active config per company on create', async () => {
    PayrollAccountConfiguration.findOne.mockResolvedValue(null);
    PayrollAccountConfiguration.create.mockResolvedValue({ id: 1, companyId: 1, active: true });
    const json = jest.fn();
    await configCtrl.update(
      {
        companyId: 1,
        body: { payroll_payable_account: 100, basic_salary_expense_account: 101 },
      },
      { json },
      jest.fn()
    );
    expect(PayrollAccountConfiguration.create).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 1, payrollPayableAccount: 100 })
    );
  });

  test('updates existing config', async () => {
    const update = jest.fn();
    PayrollAccountConfiguration.findOne.mockResolvedValue({ id: 5, update });
    const json = jest.fn();
    await configCtrl.update(
      { companyId: 1, body: { payroll_payable_account: 200 } },
      { json },
      jest.fn()
    );
    expect(update).toHaveBeenCalled();
  });
});
