const { EmployeeLoan, EmployeeLoanInstallment, Employee } = require('../models');
const {
  companyWhere,
  withCompanyId,
  stripCompanyFromBody,
  assertRecordInCompany,
  assertEmployeeInCompany,
} = require('../utils/companyScope');

exports.listLoans = async (req, res, next) => {
  try {
    const where = { ...companyWhere(req) };
    if (req.query.employee_id) where.employeeId = req.query.employee_id;
    const rows = await EmployeeLoan.findAll({
      where,
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'employeeNo', 'employeeName'] }],
      order: [['id', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.createLoan = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    await assertEmployeeInCompany(body.employee_id, req);
    const loan = await EmployeeLoan.create(
      withCompanyId(req, {
        employeeId: body.employee_id,
        loanAmount: body.loan_amount,
        monthlyInstallment: body.monthly_installment,
        balance: body.balance ?? body.loan_amount,
        startPeriodMonth: body.start_period_month,
        startPeriodYear: body.start_period_year,
        endPeriodMonth: body.end_period_month,
        endPeriodYear: body.end_period_year,
        status: 'ACTIVE',
        createdBy: req.user?.id,
      })
    );
    res.status(201).json({ success: true, data: loan });
  } catch (e) {
    next(e);
  }
};

exports.addInstallment = async (req, res, next) => {
  try {
    const loan = await assertRecordInCompany(EmployeeLoan, req.params.loanId, req);
    const body = stripCompanyFromBody(req.body);
    const inst = await EmployeeLoanInstallment.create(
      withCompanyId(req, {
        loanId: loan.id,
        duePeriodMonth: body.due_period_month,
        duePeriodYear: body.due_period_year,
        installmentAmount: body.installment_amount ?? loan.monthlyInstallment,
        status: 'PENDING',
      })
    );
    res.status(201).json({ success: true, data: inst });
  } catch (e) {
    next(e);
  }
};

exports.approveInstallment = async (req, res, next) => {
  try {
    const inst = await assertRecordInCompany(EmployeeLoanInstallment, req.params.id, req);
    if (inst.status !== 'PENDING') {
      return res.status(400).json({ message: 'Only pending installments can be approved' });
    }
    await inst.update({
      status: 'APPROVED',
      approvedBy: req.user?.id,
      approvedAt: new Date(),
    });
    res.json({ success: true, data: inst });
  } catch (e) {
    next(e);
  }
};

exports.listInstallments = async (req, res, next) => {
  try {
    const loan = await assertRecordInCompany(EmployeeLoan, req.params.loanId, req);
    const rows = await EmployeeLoanInstallment.findAll({
      where: { loanId: loan.id, ...companyWhere(req) },
      order: [['duePeriodYear', 'ASC'], ['duePeriodMonth', 'ASC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};
