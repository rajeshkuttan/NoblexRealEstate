const { Op } = require('sequelize');
const {
  Employee,
  Department,
  Designation,
  PayrollBranch,
  CostCenter,
  WorkforceGroup,
  PayrollGroup,
  VisaSponsorCompany,
  PayrollRun,
  PayrollPeriod,
  PayrollRunEmployee,
  PayrollRunComponentLine,
  PayrollComponent,
  PayrollWpsBatch,
  PayrollFinalSettlement,
  PayrollLeaveApplication,
  PayrollOvertimeRequest,
  PayrollLabourTimesheet,
  PayrollAttendancePeriod,
  PayrollAttendanceDailySummary,
  EmployeeDocument,
  EmployeeSalaryStructure,
  EmployeeSalaryLine,
  EmployeeBankDetail,
  EmployeeSeparation,
  EmployeeLedgerHeader,
  EmployeeHistory,
  EmployeeLoan,
  PayrollMonthlyAdjustment,
  LeaveType,
  AuditLog,
  User,
} = require('../models');
const { payrollHistory } = require('../services/payroll/payrollDocumentsHub.service');
const { getEmployeeLedger } = require('../services/payroll/employeeLedger.service');
const { companyWhere, assertRecordInCompany } = require('../utils/companyScope');
const { getPayrollReadiness } = require('../services/payroll/payrollReadinessService');
const { getBatchWithLines } = require('../services/payroll/payrollWpsBatchService');
const { getSettlementWithLines } = require('../services/payroll/payrollFinalSettlementService');
const { getDashboard: getFinanceDashboard } = require('../services/payroll/payrollReconciliation.service');
const { getDashboard: getDocumentsHubDashboard } = require('../services/payroll/payrollDocumentsHub.service');
const { monthBounds } = require('../services/payroll/payrollMonthlySummaryService');
const { COMPANY_ENTITY_TYPE } = require('../services/companyAuditService');
const { validatePayrollCompliance } = require('../services/payroll/payrollComplianceService');

function defaultPeriod(req) {
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const year = Number(req.query.year) || new Date().getFullYear();
  return { month, year };
}

exports.commandCenter = async (req, res, next) => {
  try {
    const { month, year } = defaultPeriod(req);
    const companyId = req.companyId;

    const readiness = await getPayrollReadiness(companyId, month, year);

    const activeEmployees = await Employee.count({
      where: { companyId, status: 'active' },
    });

    const period = await PayrollPeriod.findOne({
      where: { companyId, periodMonth: month, periodYear: year },
    });

    const runsPending = await PayrollRun.count({
      where: {
        companyId,
        status: { [Op.in]: ['DRAFT', 'CALCULATED'] },
        ...(period ? { payrollPeriodId: period.id } : {}),
      },
    });

    const wpsPending = await PayrollWpsBatch.count({
      where: {
        companyId,
        status: { [Op.in]: ['GENERATED', 'UNDER_REVIEW', 'APPROVED'] },
      },
    });

    const settlementsPending = await PayrollFinalSettlement.count({
      where: {
        companyId,
        status: { [Op.in]: ['DRAFT', 'CALCULATED', 'UNDER_REVIEW', 'APPROVED'] },
      },
    });

    const expiringDocs = await EmployeeDocument.count({
      where: {
        companyId,
        expiryDate: {
          [Op.lte]: new Date(Date.now() + 30 * 86400000),
          [Op.gte]: new Date(),
        },
      },
    });

    const finance = await getFinanceDashboard(companyId);
    const documentsHub = await getDocumentsHubDashboard(companyId);

    const action_queue = [];
    if (readiness.pending_leave_approvals > 0) {
      action_queue.push({
        id: 'leave',
        label: `Approve ${readiness.pending_leave_approvals} leave application(s)`,
        href: '/people/payroll/leave-applications?status=SUBMITTED',
        priority: 'high',
      });
    }
    if (!readiness.locked_status && readiness.period?.status !== 'LOCKED') {
      action_queue.push({
        id: 'attendance-lock',
        label: 'Lock attendance period',
        href: '/people/payroll/attendance-control',
        priority: 'high',
      });
    }
    if (runsPending > 0) {
      action_queue.push({
        id: 'payroll-run',
        label: `${runsPending} payroll run(s) need action`,
        href: '/people/payroll/calculation',
        priority: 'medium',
      });
    }
    if (wpsPending > 0) {
      action_queue.push({
        id: 'wps',
        label: `${wpsPending} WPS batch(es) pending export`,
        href: '/people/payroll/wps/batches',
        priority: 'medium',
      });
    }
    if (settlementsPending > 0) {
      action_queue.push({
        id: 'settlement',
        label: `${settlementsPending} settlement(s) in progress`,
        href: '/people/payroll/final-settlements',
        priority: 'medium',
      });
    }
    if (finance?.unposted_runs > 0) {
      action_queue.push({
        id: 'finance-post',
        label: `Post ${finance.unposted_runs} payroll run(s) to GL`,
        href: '/people/payroll/finance',
        priority: 'medium',
      });
    }
    if (expiringDocs > 0) {
      action_queue.push({
        id: 'docs',
        label: `${expiringDocs} document(s) expiring within 30 days`,
        href: '/people/payroll/documents',
        priority: 'low',
      });
    }

    res.json({
      success: true,
      data: {
        period: { month, year, payroll_period_id: period?.id, status: period?.status },
        kpis: {
          active_employees: activeEmployees,
          attendance_ready: readiness.ready_for_payroll,
          pending_leave: readiness.pending_leave_approvals,
          pending_overtime: readiness.pending_overtime_approvals,
          unapproved_timesheets: readiness.unapproved_timesheets,
          missing_attendance: readiness.missing_attendance,
          runs_pending: runsPending,
          wps_pending: wpsPending,
          settlements_pending: settlementsPending,
          expiring_documents: expiringDocs,
          finance_unposted: finance?.unposted_runs ?? 0,
          payslips_unpublished: documentsHub?.unpublished_payslips ?? 0,
        },
        readiness,
        action_queue,
        finance_summary: finance,
        documents_summary: documentsHub,
      },
    });
  } catch (e) {
    next(e);
  }
};

exports.employee360 = async (req, res, next) => {
  try {
    const emp = await Employee.findOne({
      where: { id: req.params.id, ...companyWhere(req) },
      include: [
        {
          model: Department,
          as: 'department',
          include: [{ model: CostCenter, as: 'costCenter' }],
        },
        { model: Designation, as: 'designation' },
        { model: PayrollBranch, as: 'branch' },
        { model: VisaSponsorCompany, as: 'visaSponsor' },
        { model: WorkforceGroup, as: 'workforceGroup' },
        { model: PayrollGroup, as: 'payrollGroup' },
      ],
    });
    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    const [documents, salaryStructure, lastRunLine, separation, bank, leaveApps, loans, adjustments, history, payslipHistory, ledger] =
      await Promise.all([
        EmployeeDocument.findAll({
          where: { companyId: req.companyId, employeeId: emp.id },
          order: [['expiryDate', 'ASC']],
          limit: 50,
        }),
        EmployeeSalaryStructure.findOne({
          where: { companyId: req.companyId, employeeId: emp.id, status: 'active' },
          order: [['effectiveFrom', 'DESC']],
          include: [{ model: EmployeeSalaryLine, as: 'lines', include: [{ model: PayrollComponent, as: 'component' }] }],
        }),
        PayrollRunEmployee.findOne({
          where: { companyId: req.companyId, employeeId: emp.id },
          order: [['id', 'DESC']],
          include: [
            { model: PayrollRun, as: 'payrollRun', include: [{ model: PayrollPeriod, as: 'payrollPeriod' }] },
            { model: PayrollRunComponentLine, as: 'lines', include: [{ model: PayrollComponent, as: 'component' }] },
          ],
        }),
        EmployeeSeparation.findOne({
          where: { companyId: req.companyId, employeeId: emp.id, status: { [Op.notIn]: ['CANCELLED'] } },
          order: [['id', 'DESC']],
        }),
        EmployeeBankDetail.findOne({
          where: { companyId: req.companyId, employeeId: emp.id, isPrimary: true },
        }),
        PayrollLeaveApplication.findAll({
          where: { companyId: req.companyId, employeeId: emp.id },
          include: [{ model: LeaveType, as: 'leaveType' }],
          order: [['fromDate', 'DESC']],
          limit: 20,
        }),
        EmployeeLoan.findAll({
          where: { companyId: req.companyId, employeeId: emp.id },
          order: [['id', 'DESC']],
          limit: 10,
        }),
        PayrollMonthlyAdjustment.findAll({
          where: { companyId: req.companyId, employeeId: emp.id },
          order: [['id', 'DESC']],
          limit: 20,
        }),
        EmployeeHistory.findAll({
          where: { companyId: req.companyId, employeeId: emp.id },
          order: [['eventDate', 'DESC']],
          limit: 30,
        }),
        payrollHistory(req.companyId, emp.id),
        getEmployeeLedger(req.companyId, emp.id),
      ]);

    const settlement = separation
      ? await PayrollFinalSettlement.findOne({
          where: { companyId: req.companyId, separationId: separation.id },
          order: [['id', 'DESC']],
        })
      : null;

    const payrollRuns = await PayrollRunEmployee.findAll({
      where: { companyId: req.companyId, employeeId: emp.id },
      include: [
        { model: PayrollRun, as: 'payrollRun', include: [{ model: PayrollPeriod, as: 'payrollPeriod' }] },
      ],
      order: [['id', 'DESC']],
      limit: 24,
    });

    const currentSalaryTotal = (salaryStructure?.lines || []).reduce(
      (s, l) => s + Number(l.amount || 0),
      0
    );
    const wps_ready = !!(bank?.iban && bank?.wpsEnabled !== false);
    const now = new Date();
    const soon = new Date(Date.now() + 30 * 86400000);

    res.json({
      success: true,
      data: {
        employee: emp,
        bank,
        documents,
        salary_structure: salaryStructure,
        current_salary_total: Math.round(currentSalaryTotal * 100) / 100,
        last_run_line: lastRunLine,
        payroll_history: payrollRuns,
        payslip_history: payslipHistory,
        leave_applications: leaveApps,
        loans,
        adjustments,
        history,
        separation,
        settlement,
        ledger,
        wps_ready,
        document_risk: {
          expiring: documents.filter((d) => d.expiryDate && new Date(d.expiryDate) <= soon && new Date(d.expiryDate) >= now)
            .length,
          expired: documents.filter((d) => d.expiryDate && new Date(d.expiryDate) < now).length,
        },
      },
    });
  } catch (e) {
    next(e);
  }
};

exports.attendanceExceptions = async (req, res, next) => {
  try {
    const { month, year } = defaultPeriod(req);
    const companyId = req.companyId;
    const readiness = await getPayrollReadiness(companyId, month, year);
    const { fromDate, toDate } = monthBounds(year, month);

    const exceptions = [];

    const pendingLeave = await PayrollLeaveApplication.findAll({
      where: { companyId, status: 'SUBMITTED' },
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'employeeName', 'employeeNo'] }],
      limit: 100,
    });
    pendingLeave.forEach((la) => {
      exceptions.push({
        employee_id: la.employeeId,
        employee_name: la.employee?.employeeName,
        issue: 'Pending leave approval',
        severity: 'high',
        action_href: '/people/payroll/leave-applications?status=SUBMITTED',
      });
    });

    const pendingOt = await PayrollOvertimeRequest.findAll({
      where: { companyId, status: 'SUBMITTED' },
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'employeeName'] }],
      limit: 100,
    });
    pendingOt.forEach((ot) => {
      exceptions.push({
        employee_id: ot.employeeId,
        employee_name: ot.employee?.employeeName,
        issue: 'Pending overtime approval',
        severity: 'medium',
        action_href: '/people/payroll/overtime?status=SUBMITTED',
      });
    });

    const unapprovedTs = await PayrollLabourTimesheet.findAll({
      where: {
        companyId,
        timesheetMonth: month,
        timesheetYear: year,
        status: { [Op.in]: ['DRAFT', 'SUBMITTED'] },
      },
      limit: 50,
    });
    unapprovedTs.forEach((ts) => {
      exceptions.push({
        employee_id: null,
        employee_name: `Timesheet #${ts.id}`,
        issue: `Labour timesheet ${ts.status}`,
        severity: 'medium',
        action_href: '/people/payroll/labour-timesheets',
      });
    });

    const attExceptions = await PayrollAttendanceDailySummary.findAll({
      where: {
        companyId,
        attendanceDate: { [Op.between]: [fromDate, toDate] },
        attendanceStatus: { [Op.in]: ['ABSENT', 'MISSING_PUNCH', 'UNPAID_LEAVE'] },
      },
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'employeeName'] }],
      limit: 200,
    });
    attExceptions.forEach((a) => {
      exceptions.push({
        employee_id: a.employeeId,
        employee_name: a.employee?.employeeName,
        issue: `Attendance: ${a.attendanceStatus}`,
        severity: 'high',
        action_href: '/people/payroll/attendance-control',
      });
    });

    if (!readiness.period?.id) {
      exceptions.push({
        issue: 'Attendance period not generated',
        severity: 'high',
        action_href: '/people/payroll/attendance-periods',
      });
    } else if (readiness.period.status !== 'LOCKED') {
      exceptions.push({
        issue: `Attendance period is ${readiness.period.status} (not locked)`,
        severity: 'medium',
        action_href: '/people/payroll/attendance-control',
      });
    }

    res.json({
      success: true,
      data: {
        month,
        year,
        readiness,
        exceptions,
        total: exceptions.length,
      },
    });
  } catch (e) {
    next(e);
  }
};

exports.runDetail = async (req, res, next) => {
  try {
    const run = await assertRecordInCompany(PayrollRun, req.params.id, req, {
      include: [{ model: PayrollPeriod, as: 'payrollPeriod' }],
    });

    const employees = await PayrollRunEmployee.findAll({
      where: { payrollRunId: run.id, ...companyWhere(req) },
      include: [
        { model: Employee, as: 'employee' },
        {
          model: PayrollRunComponentLine,
          as: 'lines',
          include: [{ model: PayrollComponent, as: 'component' }],
        },
      ],
    });

    const exceptionRows = employees.filter((e) => e.status === 'EXCEPTION');

    const componentMap = {};
    for (const re of employees) {
      for (const line of re.lines || []) {
        const key = line.component?.componentCode || line.componentId || line.calculationMethod;
        if (!componentMap[key]) {
          componentMap[key] = {
            component_code: key,
            component_name: line.component?.componentName || key,
            component_type: line.componentType,
            total: 0,
          };
        }
        componentMap[key].total += Number(line.calculatedAmount || 0);
      }
    }
    const component_breakdown = Object.values(componentMap).map((c) => ({
      ...c,
      total: Math.round(c.total * 100) / 100,
    }));

    let variance = [];
    const period = run.payrollPeriod;
    if (period) {
      let prevMonth = period.periodMonth - 1;
      let prevYear = period.periodYear;
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear -= 1;
      }
      const prevPeriod = await PayrollPeriod.findOne({
        where: { companyId: req.companyId, periodMonth: prevMonth, periodYear: prevYear },
      });
      if (prevPeriod) {
        const prevRun = await PayrollRun.findOne({
          where: {
            companyId: req.companyId,
            payrollPeriodId: prevPeriod.id,
            status: { [Op.in]: ['CALCULATED', 'APPROVED', 'LOCKED'] },
          },
          order: [['id', 'DESC']],
        });
        if (prevRun) {
          const prevRows = await PayrollRunEmployee.findAll({
            where: { payrollRunId: prevRun.id, ...companyWhere(req) },
          });
          const prevMap = new Map(prevRows.map((r) => [r.employeeId, r]));
          variance = employees.map((c) => {
            const p = prevMap.get(c.employeeId);
            const currNet = Number(c.netSalary);
            const prevNet = p ? Number(p.netSalary) : 0;
            const diff = currNet - prevNet;
            return {
              employee: c.employee,
              current_net: currNet,
              previous_net: prevNet,
              variance: Math.round(diff * 100) / 100,
            };
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        run,
        register: employees,
        exceptions: exceptionRows,
        component_breakdown,
        variance,
        totals: {
          employees: run.totalEmployees,
          gross: run.totalGross,
          deductions: run.totalDeductions,
          net: run.totalNet,
          exception_count: exceptionRows.length,
        },
      },
    });
  } catch (e) {
    next(e);
  }
};

exports.runEmployeeLine = async (req, res, next) => {
  try {
    const run = await assertRecordInCompany(PayrollRun, req.params.id, req);
    const line = await PayrollRunEmployee.findOne({
      where: {
        payrollRunId: run.id,
        employeeId: req.params.employeeId,
        ...companyWhere(req),
      },
      include: [
        { model: Employee, as: 'employee' },
        {
          model: PayrollRunComponentLine,
          as: 'lines',
          include: [{ model: PayrollComponent, as: 'component' }],
        },
      ],
    });
    if (!line) return res.status(404).json({ message: 'Employee line not found on this run' });
    const earnings = (line.lines || []).filter((l) => l.componentType === 'EARNING');
    const deductions = (line.lines || []).filter((l) => l.componentType === 'DEDUCTION');
    res.json({
      success: true,
      data: {
        line,
        earnings,
        deductions,
        attendance_snapshot: line.attendanceSnapshot,
        salary_structure_snapshot: line.salaryStructureSnapshot,
      },
    });
  } catch (e) {
    next(e);
  }
};

exports.wpsBatchDetail = async (req, res, next) => {
  try {
    const batch = await getBatchWithLines(req.companyId, req.params.id);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    let compliance = null;
    if (batch.payrollRunId) {
      try {
        compliance = await validatePayrollCompliance({
          companyId: req.companyId,
          payrollRunId: batch.payrollRunId,
        });
      } catch (e) {
        compliance = { errors: [e.message], warnings: [] };
      }
    }

    res.json({
      success: true,
      data: { batch, compliance },
    });
  } catch (e) {
    next(e);
  }
};

exports.settlementDetail = async (req, res, next) => {
  try {
    const settlement = await getSettlementWithLines(req.companyId, req.params.id);
    if (!settlement) return res.status(404).json({ message: 'Settlement not found' });

    const earnings = (settlement.lines || []).filter((l) =>
      ['EOSB', 'LEAVE_ENCASHMENT', 'SALARY_PAYABLE', 'BONUS'].includes(l.lineType)
    );
    const deductions = (settlement.lines || []).filter((l) =>
      ['LOAN_RECOVERY', 'NOTICE_RECOVERY', 'DEDUCTION', 'ADJUSTMENT'].includes(l.lineType)
    );

    res.json({
      success: true,
      data: {
        settlement,
        separation: settlement.separation,
        employee: settlement.employee,
        calculation_snapshot: settlement.calculationSnapshot,
        earnings,
        deductions,
      },
    });
  } catch (e) {
    next(e);
  }
};

exports.costAllocation = async (req, res, next) => {
  try {
    const runId = req.query.run_id;
    const periodId = req.query.period_id;
    let run = null;
    if (runId) {
      run = await PayrollRun.findOne({ where: { id: runId, ...companyWhere(req) } });
    } else if (periodId) {
      run = await PayrollRun.findOne({
        where: {
          payrollPeriodId: periodId,
          ...companyWhere(req),
          status: { [Op.in]: ['CALCULATED', 'APPROVED', 'LOCKED'] },
        },
        order: [['id', 'DESC']],
      });
    }
    if (!run) {
      return res.status(404).json({ message: 'Payroll run not found for cost allocation' });
    }

    const rows = await PayrollRunEmployee.findAll({
      where: { payrollRunId: run.id, ...companyWhere(req) },
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [
            {
              model: Department,
              as: 'department',
              include: [{ model: CostCenter, as: 'costCenter' }],
            },
            { model: WorkforceGroup, as: 'workforceGroup' },
          ],
        },
      ],
    });

    const byDepartment = {};
    const byCostCenter = {};
    const byWorkforce = {};

    rows.forEach((re) => {
      const dept = re.employee?.department?.departmentName || 'Unassigned';
      const cc =
        re.employee?.department?.costCenter?.costCenterCode ||
        re.employee?.department?.costCenter?.costCenterName ||
        dept;
      const wf = re.employee?.workforceGroup?.groupCode || re.employee?.workforceGroup?.groupName || 'STAFF';
      const net = Number(re.netSalary);

      byDepartment[dept] = (byDepartment[dept] || 0) + net;
      byCostCenter[cc] = (byCostCenter[cc] || 0) + net;
      byWorkforce[wf] = (byWorkforce[wf] || 0) + net;
    });

    const toRows = (obj, keyField) =>
      Object.entries(obj).map(([k, v]) => ({
        [keyField]: k,
        property: 'via allocation',
        net_pay: Math.round(v * 100) / 100,
        employee_count: rows.filter((r) => {
          if (keyField === 'department') return (r.employee?.department?.departmentName || 'Unassigned') === k;
          if (keyField === 'cost_center') {
            const rcc =
              r.employee?.department?.costCenter?.costCenterCode ||
              r.employee?.department?.departmentName ||
              'Unassigned';
            return rcc === k;
          }
          const rwf = r.employee?.workforceGroup?.groupCode || r.employee?.workforceGroup?.groupName || 'STAFF';
          return rwf === k;
        }).length,
      }));

    res.json({
      success: true,
      data: {
        run: { id: run.id, status: run.status },
        by_department: toRows(byDepartment, 'department'),
        by_cost_center: toRows(byCostCenter, 'cost_center'),
        by_workforce: toRows(byWorkforce, 'workforce'),
      },
    });
  } catch (e) {
    next(e);
  }
};

exports.audit = async (req, res, next) => {
  try {
    const { entity_type, entity_id } = req.query;
    const where = {
      entityType: COMPANY_ENTITY_TYPE,
      entityId: req.companyId,
    };

    const rows = await AuditLog.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    let filtered = rows;
    if (entity_type || entity_id) {
      filtered = rows.filter((r) => {
        const nv = r.newValue || {};
        if (entity_id && nv.run_id != entity_id && nv.employee_id != entity_id && nv.batch_id != entity_id && nv.settlement_id != entity_id) {
          if (String(nv.employee_id) !== String(entity_id) && String(nv.run_id) !== String(entity_id)) {
            return false;
          }
        }
        if (entity_type && nv.module && !String(nv.module).includes(entity_type)) {
          return false;
        }
        return true;
      });
    }

    const data = filtered.map((r) => ({
      id: r.id,
      action: r.action,
      created_at: r.createdAt,
      user: r.user,
      metadata: r.newValue,
    }));

    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
