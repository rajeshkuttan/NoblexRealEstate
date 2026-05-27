const { Op } = require('sequelize');
const {
  Employee,
  Department,
  Designation,
  PayrollBranch,
  EmployeeHistory,
  EmployeeAssignment,
  VisaSponsorCompany,
  WorkforceGroup,
  PayrollGroup,
  EmployeeBankDetail,
  EmployeeDocument,
  EmployeeSalaryStructure,
  EmployeeSalaryLine,
} = require('../models');
const {
  companyWhere,
  withCompanyId,
  stripCompanyFromBody,
  assertRecordInCompany,
  assertEmployeeInCompany,
} = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');

const employeeInclude = [
  { model: Department, as: 'department', attributes: ['id', 'departmentName'] },
  { model: Designation, as: 'designation', attributes: ['id', 'designationName'] },
  { model: PayrollBranch, as: 'branch', attributes: ['id', 'branchName'] },
  { model: VisaSponsorCompany, as: 'visaSponsor', attributes: ['id', 'sponsorName'] },
  { model: WorkforceGroup, as: 'workforceGroup', attributes: ['id', 'groupCode', 'groupName'] },
  { model: PayrollGroup, as: 'payrollGroup', attributes: ['id', 'groupCode', 'groupName'] },
];

exports.list = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      status,
      department_id,
      designation_id,
      workforce_group_id,
      visa_sponsor_id,
      wps_ready,
      document_risk,
    } = req.query;
    const where = { ...companyWhere(req) };
    if (status) where.status = status;
    if (department_id) where.departmentId = department_id;
    if (designation_id) where.designationId = designation_id;
    if (workforce_group_id) where.workforceGroupId = workforce_group_id;
    if (visa_sponsor_id) where.visaSponsorCompanyId = visa_sponsor_id;
    if (search) {
      where[Op.or] = [
        { employeeNo: { [Op.like]: `%${search}%` } },
        { employeeName: { [Op.like]: `%${search}%` } },
      ];
    }
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const { count, rows } = await Employee.findAndCountAll({
      where,
      include: employeeInclude,
      order: [['employeeName', 'ASC']],
      limit: parseInt(limit, 10),
      offset,
    });

    const empIds = rows.map((r) => r.id);
    const banks = empIds.length
      ? await EmployeeBankDetail.findAll({
          where: { companyId: req.companyId, employeeId: empIds, isPrimary: true },
        })
      : [];
    const bankByEmp = new Map(banks.map((b) => [b.employeeId, b]));
    const docs = empIds.length
      ? await EmployeeDocument.findAll({
          where: { companyId: req.companyId, employeeId: empIds },
          attributes: ['employeeId', 'expiryDate'],
        })
      : [];
    const docRiskByEmp = new Map();
    const now = new Date();
    const soon = new Date(Date.now() + 30 * 86400000);
    for (const d of docs) {
      if (!d.expiryDate) continue;
      const exp = new Date(d.expiryDate);
      const cur = docRiskByEmp.get(d.employeeId) || { expiring: 0, expired: 0 };
      if (exp < now) cur.expired += 1;
      else if (exp <= soon) cur.expiring += 1;
      docRiskByEmp.set(d.employeeId, cur);
    }
    const structures = empIds.length
      ? await EmployeeSalaryStructure.findAll({
          where: { companyId: req.companyId, employeeId: empIds, status: 'active' },
          include: [{ model: EmployeeSalaryLine, as: 'lines' }],
        })
      : [];
    const salaryByEmp = new Map();
    for (const s of structures) {
      const total = (s.lines || []).reduce((sum, l) => sum + Number(l.amount || 0), 0);
      if (!salaryByEmp.has(s.employeeId)) salaryByEmp.set(s.employeeId, total);
    }

    let data = rows.map((e) => {
      const bank = bankByEmp.get(e.id);
      const wpsReady = !!(bank?.iban && bank?.wpsEnabled !== false);
      const risk = docRiskByEmp.get(e.id) || { expiring: 0, expired: 0 };
      return {
        ...e.toJSON(),
        wps_ready: wpsReady,
        document_risk: risk,
        current_salary_total: salaryByEmp.get(e.id) ?? null,
        primary_bank: bank ? { iban: bank.iban, wps_enabled: bank.wpsEnabled } : null,
      };
    });

    if (wps_ready === 'true') data = data.filter((e) => e.wps_ready);
    if (wps_ready === 'false') data = data.filter((e) => !e.wps_ready);
    if (document_risk === 'expiring') data = data.filter((e) => e.document_risk.expiring > 0);
    if (document_risk === 'expired') data = data.filter((e) => e.document_risk.expired > 0);

    res.json({ success: true, data, pagination: { total: count, page: parseInt(page, 10), limit: parseInt(limit, 10) } });
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const emp = await Employee.findOne({
      where: { id: req.params.id, ...companyWhere(req) },
      include: [
        ...employeeInclude,
        { model: EmployeeHistory, as: 'history', separate: true, order: [['eventDate', 'DESC']] },
        { model: EmployeeAssignment, as: 'assignments', separate: true, order: [['effectiveFrom', 'DESC']] },
      ],
    });
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, data: emp });
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    const emp = await Employee.create(
      withCompanyId(req, { ...body, createdBy: req.user?.id })
    );
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.EMPLOYEE_CREATED,
      entityId: req.companyId,
      metadata: { company_id: req.companyId, employee_id: emp.id, employee_no: emp.employeeNo },
    });
    res.status(201).json({ success: true, data: emp });
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const emp = await assertRecordInCompany(Employee, req.params.id, req);
    const body = stripCompanyFromBody(req.body);
    await emp.update(body);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.EMPLOYEE_UPDATED,
      entityId: req.companyId,
      metadata: { company_id: req.companyId, employee_id: emp.id },
    });
    res.json({ success: true, data: emp });
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const emp = await assertRecordInCompany(Employee, req.params.id, req);
    await emp.update({ status: 'inactive' });
    res.json({ success: true, message: 'Employee deactivated' });
  } catch (e) {
    next(e);
  }
};

exports.addHistory = async (req, res, next) => {
  try {
    await assertEmployeeInCompany(req.params.id, req);
    const body = stripCompanyFromBody(req.body);
    const row = await EmployeeHistory.create(
      withCompanyId(req, {
        employeeId: parseInt(req.params.id, 10),
        eventType: body.eventType,
        eventDate: body.eventDate,
        notes: body.notes,
        metadataJson: body.metadataJson || null,
        recordedBy: req.user?.id,
      })
    );
    const auditAction =
      body.eventType === 'PROMOTION'
        ? COMPANY_AUDIT_ACTIONS.PROMOTION_RECORDED
        : body.eventType === 'TRANSFER'
          ? COMPANY_AUDIT_ACTIONS.TRANSFER_RECORDED
          : COMPANY_AUDIT_ACTIONS.EMPLOYEE_UPDATED;
    await logCompanyEvent({
      req,
      action: auditAction,
      entityId: req.companyId,
      metadata: { company_id: req.companyId, employee_id: req.params.id, event_type: body.eventType },
    });
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.addAssignment = async (req, res, next) => {
  try {
    await assertEmployeeInCompany(req.params.id, req);
    const body = stripCompanyFromBody(req.body);
    const row = await EmployeeAssignment.create(
      withCompanyId(req, { ...body, employeeId: parseInt(req.params.id, 10) })
    );
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};
