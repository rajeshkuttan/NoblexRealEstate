jest.mock('../../../utils/companyScope', () => ({
  assertEmployeeInCompany: jest.fn(),
  companyWhere: () => ({ companyId: 1 }),
}));

jest.mock('../../../models', () => ({
  Employee: { findOne: jest.fn() },
  PayrollRunEmployee: { findOne: jest.fn() },
  PayrollRun: {},
  PayrollExport: { create: jest.fn() },
}));

jest.mock('../../../services/payroll/payrollDocumentRender.service', () => ({
  renderAndSavePdf: jest.fn().mockResolvedValue({ relativePath: '/uploads/payroll/documents/1/cert.pdf' }),
}));

const { Employee, PayrollRunEmployee, PayrollExport } = require('../../../models');
const { generateCertificate } = require('../../../services/payroll/payrollSalaryCertificate.service');

describe('payrollSalaryCertificate', () => {
  test('uses locked run snapshot for salary', async () => {
    Employee.findOne.mockResolvedValue({
      id: 5,
      employeeNo: 'E1',
      employeeName: 'John',
      joiningDate: '2020-01-01',
    });
    PayrollRunEmployee.findOne.mockResolvedValue({
      grossSalary: 15000,
      netSalary: 14000,
      deductions: 1000,
      salaryStructureSnapshot: { basic: 10000 },
      payrollRunId: 99,
      payrollRun: { status: 'LOCKED' },
    });
    PayrollExport.create.mockResolvedValue({ id: 1 });

    const r = await generateCertificate({
      req: { companyId: 1, user: { id: 1 } },
      employeeId: 5,
      certificateType: 'SALARY',
    });
    expect(r.snapshot.salaryFromLockedRun.grossSalary).toBe(15000);
    expect(r.snapshot.employee.employeeName).toBe('John');
  });
});
