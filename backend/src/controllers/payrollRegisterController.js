const { Op } = require('sequelize');
const {
  PayrollRun,
  PayrollRunEmployee,
  PayrollRunComponentLine,
  PayrollPeriod,
  Employee,
  PayrollComponent,
} = require('../models');
const { companyWhere } = require('../utils/companyScope');
const { getMonthlySummary } = require('../services/payroll/payrollMonthlySummaryService');

async function resolveRun(req) {
  if (req.query.run_id) {
    return PayrollRun.findOne({
      where: { id: req.query.run_id, ...companyWhere(req) },
      include: [{ model: PayrollPeriod, as: 'payrollPeriod' }],
    });
  }
  if (req.query.period_id) {
    return PayrollRun.findOne({
      where: {
        payrollPeriodId: req.query.period_id,
        ...companyWhere(req),
        status: { [Op.in]: ['CALCULATED', 'APPROVED', 'LOCKED'] },
      },
      order: [['id', 'DESC']],
      include: [{ model: PayrollPeriod, as: 'payrollPeriod' }],
    });
  }
  return null;
}

exports.register = async (req, res, next) => {
  try {
    const run = await resolveRun(req);
    if (!run) {
      return res.status(404).json({ message: 'Payroll run not found' });
    }
    const rows = await PayrollRunEmployee.findAll({
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

    const data = rows.map((re) => {
      const lines = re.lines || [];
      const basic = lines
        .filter((l) => l.componentType === 'EARNING' && (l.component?.componentCode === 'BASIC' || l.calculationMethod === 'PRORATE'))
        .reduce((s, l) => s + Number(l.calculatedAmount), 0);
      const allowances = lines
        .filter((l) => l.componentType === 'EARNING' && l.calculationMethod !== 'OVERTIME_HOURLY' && l.calculationMethod !== 'ADJUSTMENT')
        .reduce((s, l) => s + Number(l.calculatedAmount), 0) - basic;
      const overtime = lines
        .filter((l) => l.calculationMethod === 'OVERTIME_HOURLY')
        .reduce((s, l) => s + Number(l.calculatedAmount), 0);
      const gross = Number(re.grossSalary);
      const deductions = Number(re.deductions);
      return {
        employee: re.employee,
        basic: Math.round(basic * 100) / 100,
        allowances: Math.round(Math.max(0, allowances) * 100) / 100,
        overtime: Math.round(overtime * 100) / 100,
        gross,
        deductions,
        net: Number(re.netSalary),
        status: re.status,
        payable_days: re.payableDays,
        working_days: re.workingDays,
      };
    });

    res.json({
      success: true,
      run: { id: run.id, status: run.status, period: run.payrollPeriod },
      data,
    });
  } catch (e) {
    next(e);
  }
};

exports.variance = async (req, res, next) => {
  try {
    const currentId = Number(req.query.current_period_id);
    const previousId = Number(req.query.previous_period_id);
    if (!currentId || !previousId) {
      return res.status(400).json({ message: 'current_period_id and previous_period_id required' });
    }

    const loadRun = async (periodId) => {
      const run = await PayrollRun.findOne({
        where: {
          payrollPeriodId: periodId,
          ...companyWhere(req),
          status: { [Op.in]: ['CALCULATED', 'APPROVED', 'LOCKED'] },
        },
        order: [['id', 'DESC']],
      });
      if (!run) return [];
      return PayrollRunEmployee.findAll({
        where: { payrollRunId: run.id, ...companyWhere(req) },
        include: [{ model: Employee, as: 'employee' }],
      });
    };

    const current = await loadRun(currentId);
    const previous = await loadRun(previousId);
    const prevMap = new Map(previous.map((r) => [r.employeeId, r]));

    const data = current.map((c) => {
      const p = prevMap.get(c.employeeId);
      const currNet = Number(c.netSalary);
      const prevNet = p ? Number(p.netSalary) : 0;
      const diff = currNet - prevNet;
      return {
        employee: c.employee,
        current_net: currNet,
        previous_net: prevNet,
        variance: Math.round(diff * 100) / 100,
        reason: diff > 0 ? 'salary increase' : diff < 0 ? 'salary decrease' : 'unchanged',
      };
    });

    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.dashboard = async (req, res, next) => {
  try {
    const periodId = req.query.period_id;
    const run = periodId ? await resolveRun({ ...req, query: { period_id: periodId } }) : null;

    let exceptions = [];
    if (periodId && !run) {
      const period = await PayrollPeriod.findOne({ where: { id: periodId, ...companyWhere(req) } });
      if (period) {
        const summaries = await getMonthlySummary(req.companyId, {
          month: period.periodMonth,
          year: period.periodYear,
        });
        const { Employee: Emp, EmployeeSalaryStructure: ESS } = require('../models');
        const employees = await Emp.findAll({ where: { companyId: req.companyId, status: 'active' } });
        const summaryIds = new Set(summaries.map((s) => s.employee?.id));
        for (const e of employees) {
          if (!summaryIds.has(e.id)) {
            exceptions.push({ employeeId: e.id, employeeName: e.employeeName, issue: 'Missing attendance' });
          }
        }
      }
    }

    if (run) {
      const exRows = await PayrollRunEmployee.findAll({
        where: { payrollRunId: run.id, status: 'EXCEPTION', ...companyWhere(req) },
        include: [{ model: Employee, as: 'employee' }],
      });
      exceptions = exRows.map((r) => ({
        employeeId: r.employeeId,
        employeeName: r.employee?.employeeName,
        issue: 'Calculation exception',
        net: r.netSalary,
      }));
    }

    res.json({
      success: true,
      data: {
        run: run
          ? {
              id: run.id,
              status: run.status,
              total_employees: run.totalEmployees,
              total_gross: run.totalGross,
              total_deductions: run.totalDeductions,
              total_net: run.totalNet,
            }
          : null,
        exceptions,
        pending_reviews: run?.status === 'CALCULATED' ? run.totalEmployees : 0,
      },
    });
  } catch (e) {
    next(e);
  }
};
