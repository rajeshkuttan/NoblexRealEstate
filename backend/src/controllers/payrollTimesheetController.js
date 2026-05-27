const { Op } = require('sequelize');
const {
  PayrollLabourTimesheet,
  PayrollLabourTimesheetLine,
  Employee,
  WorkforceGroup,
  Department,
  CostCenter,
} = require('../models');
const {
  companyWhere,
  withCompanyId,
  stripCompanyFromBody,
  assertRecordInCompany,
  assertEmployeeInCompany,
  assertDepartmentInCompany,
} = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');
const { applyLabourLine } = require('../services/payroll/payrollDailySummaryService');
const {
  assertPeriodNotLockedForRange,
  AttendancePeriodLockedError,
  LOCKED_MESSAGE,
} = require('../services/payroll/payrollAttendancePeriodGuard');

const LABOUR_CODES = ['LABOUR', 'LABOR', 'TECHNICAL', 'TECH'];

async function assertLabourEmployee(employeeId, req) {
  const emp = await assertEmployeeInCompany(employeeId, req);
  if (!emp.workforceGroupId) {
    const err = new Error('Employee is not in a labour workforce group');
    err.statusCode = 400;
    throw err;
  }
  const wg = await WorkforceGroup.findOne({ where: { id: emp.workforceGroupId, ...companyWhere(req) } });
  const code = (wg?.groupCode || wg?.groupName || '').toUpperCase();
  if (!LABOUR_CODES.some((c) => code.includes(c))) {
    const err = new Error('Only Labour/Technical workforce employees allowed');
    err.statusCode = 400;
    throw err;
  }
  return emp;
}

exports.list = async (req, res, next) => {
  try {
    const where = { ...companyWhere(req) };
    if (req.query.timesheet_month) where.timesheetMonth = req.query.timesheet_month;
    if (req.query.timesheet_year) where.timesheetYear = req.query.timesheet_year;
    const rows = await PayrollLabourTimesheet.findAll({
      where,
      include: [
        { model: Department, as: 'department' },
        { model: CostCenter, as: 'costCenter' },
        { model: PayrollLabourTimesheetLine, as: 'lines' },
      ],
      order: [['timesheetYear', 'DESC'], ['timesheetMonth', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const row = await assertRecordInCompany(PayrollLabourTimesheet, req.params.id, req, {
      include: [{ model: PayrollLabourTimesheetLine, as: 'lines' }],
    });
    res.json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    if (body.department_id) await assertDepartmentInCompany(body.department_id, req);
    const header = await PayrollLabourTimesheet.create(
      withCompanyId(req, {
        timesheetMonth: body.timesheet_month,
        timesheetYear: body.timesheet_year,
        departmentId: body.department_id,
        costCenterId: body.cost_center_id,
        status: 'DRAFT',
        createdBy: req.user?.id,
      })
    );
    const lines = [];
    for (const ln of body.lines || []) {
      await assertLabourEmployee(ln.employee_id, req);
      const line = await PayrollLabourTimesheetLine.create(
        withCompanyId(req, {
          timesheetId: header.id,
          employeeId: ln.employee_id,
          workDate: ln.work_date,
          normalHours: ln.normal_hours || 0,
          overtimeHours: ln.overtime_hours || 0,
          holidayHours: ln.holiday_hours || 0,
          absenceHours: ln.absence_hours || 0,
          remarks: ln.remarks,
        })
      );
      lines.push(line);
    }
    res.status(201).json({ success: true, data: { ...header.toJSON(), lines } });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const header = await assertRecordInCompany(PayrollLabourTimesheet, req.params.id, req);
    if (['APPROVED', 'LOCKED'].includes(header.status)) {
      return res.status(400).json({ message: 'Cannot update approved or locked timesheet' });
    }
    const from = `${header.timesheetYear}-${String(header.timesheetMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(header.timesheetYear, header.timesheetMonth, 0).getDate();
    const to = `${header.timesheetYear}-${String(header.timesheetMonth).padStart(2, '0')}-${lastDay}`;
    try {
      await assertPeriodNotLockedForRange(req.companyId, from, to);
    } catch (e) {
      if (e instanceof AttendancePeriodLockedError) {
        return res.status(403).json({ message: LOCKED_MESSAGE });
      }
      throw e;
    }
    const body = stripCompanyFromBody(req.body);
    if (Array.isArray(body.lines)) {
      await PayrollLabourTimesheetLine.destroy({ where: { timesheetId: header.id, ...companyWhere(req) } });
      for (const ln of body.lines) {
        await assertLabourEmployee(ln.employee_id, req);
        await PayrollLabourTimesheetLine.create(
          withCompanyId(req, {
            timesheetId: header.id,
            employeeId: ln.employee_id,
            workDate: ln.work_date,
            normalHours: ln.normal_hours || 0,
            overtimeHours: ln.overtime_hours || 0,
            holidayHours: ln.holiday_hours || 0,
            absenceHours: ln.absence_hours || 0,
            remarks: ln.remarks,
          })
        );
      }
    }
    res.json({ success: true, data: await assertRecordInCompany(PayrollLabourTimesheet, header.id, req, {
      include: [{ model: PayrollLabourTimesheetLine, as: 'lines' }],
    }) });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.submit = async (req, res, next) => {
  try {
    const header = await assertRecordInCompany(PayrollLabourTimesheet, req.params.id, req);
    if (header.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only draft timesheets can be submitted' });
    }
    await header.update({ status: 'SUBMITTED' });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.LABOUR_TIMESHEET_SUBMITTED,
      entityId: req.companyId,
      metadata: { timesheet_id: header.id },
    });
    res.json({ success: true, data: header });
  } catch (e) {
    next(e);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const header = await assertRecordInCompany(PayrollLabourTimesheet, req.params.id, req, {
      include: [{ model: PayrollLabourTimesheetLine, as: 'lines' }],
    });
    if (header.status !== 'SUBMITTED') {
      return res.status(400).json({ message: 'Only submitted timesheets can be approved' });
    }
    const from = `${header.timesheetYear}-${String(header.timesheetMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(header.timesheetYear, header.timesheetMonth, 0).getDate();
    const to = `${header.timesheetYear}-${String(header.timesheetMonth).padStart(2, '0')}-${lastDay}`;
    try {
      await assertPeriodNotLockedForRange(req.companyId, from, to);
    } catch (e) {
      if (e instanceof AttendancePeriodLockedError) {
        return res.status(403).json({ message: LOCKED_MESSAGE });
      }
      throw e;
    }
    for (const line of header.lines || []) {
      await applyLabourLine(req.companyId, line);
    }
    await header.update({
      status: 'APPROVED',
      approvedBy: req.user?.id,
      approvedAt: new Date(),
    });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.LABOUR_TIMESHEET_APPROVED,
      entityId: req.companyId,
      metadata: { timesheet_id: header.id },
    });
    res.json({ success: true, data: header });
  } catch (e) {
    next(e);
  }
};
