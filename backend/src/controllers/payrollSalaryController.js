const {
  EmployeeSalaryStructure,
  EmployeeSalaryLine,
  PayrollComponent,
  Employee,
} = require('../models');
const {
  companyWhere,
  withCompanyId,
  stripCompanyFromBody,
  assertRecordInCompany,
  assertEmployeeInCompany,
} = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');

async function persistLines(structureId, req, lines) {
  await EmployeeSalaryLine.destroy({
    where: { salaryStructureId: structureId, ...companyWhere(req) },
  });
  if (!Array.isArray(lines)) return;
  for (const line of lines) {
    await EmployeeSalaryLine.create(
      withCompanyId(req, {
        salaryStructureId: structureId,
        payrollComponentId: line.payrollComponentId,
        lineDescription: line.lineDescription,
        amount: line.amount,
      })
    );
  }
}

exports.list = async (req, res, next) => {
  try {
    const where = companyWhere(req);
    if (req.query.employee_id) where.employeeId = req.query.employee_id;
    const rows = await EmployeeSalaryStructure.findAll({
      where,
      include: [
        { model: Employee, as: 'employee', attributes: ['id', 'employeeNo', 'employeeName'] },
        {
          model: EmployeeSalaryLine,
          as: 'lines',
          include: [{ model: PayrollComponent, as: 'component', attributes: ['id', 'componentCode', 'componentName'] }],
        },
      ],
      order: [['effectiveFrom', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const row = await EmployeeSalaryStructure.findOne({
      where: { id: req.params.id, ...companyWhere(req) },
      include: [
        { model: Employee, as: 'employee' },
        {
          model: EmployeeSalaryLine,
          as: 'lines',
          include: [{ model: PayrollComponent, as: 'component' }],
        },
      ],
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    const lines = body.lines;
    delete body.lines;
    await assertEmployeeInCompany(body.employeeId, req);
    const structure = await EmployeeSalaryStructure.create(withCompanyId(req, body));
    await persistLines(structure.id, req, lines);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.SALARY_STRUCTURE_UPDATED,
      entityId: req.companyId,
      metadata: { company_id: req.companyId, employee_id: body.employeeId, structure_id: structure.id },
    });
    const full = await EmployeeSalaryStructure.findOne({
      where: { id: structure.id, ...companyWhere(req) },
      include: [{ model: EmployeeSalaryLine, as: 'lines' }],
    });
    res.status(201).json({ success: true, data: full });
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const structure = await assertRecordInCompany(EmployeeSalaryStructure, req.params.id, req);
    const body = stripCompanyFromBody(req.body);
    const lines = body.lines;
    delete body.lines;
    await structure.update(body);
    if (lines) await persistLines(structure.id, req, lines);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.SALARY_STRUCTURE_UPDATED,
      entityId: req.companyId,
      metadata: { company_id: req.companyId, structure_id: structure.id },
    });
    const full = await EmployeeSalaryStructure.findOne({
      where: { id: structure.id, ...companyWhere(req) },
      include: [{ model: EmployeeSalaryLine, as: 'lines' }],
    });
    res.json({ success: true, data: full });
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const structure = await assertRecordInCompany(EmployeeSalaryStructure, req.params.id, req);
    await structure.update({ status: 'inactive' });
    res.json({ success: true, message: 'Deactivated' });
  } catch (e) {
    next(e);
  }
};
