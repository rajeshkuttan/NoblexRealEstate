const { Op } = require('sequelize');
const {
  Employee,
  EmployeeSalaryStructure,
  EmployeeSalaryLine,
  PayrollComponent,
  PayrollRun,
  PayrollRunEmployee,
  PayrollRunComponentLine,
  PayrollPeriod,
  PayrollMonthlyAdjustment,
  EmployeeLoanInstallment,
  EmployeeLoan,
  PayrollOvertimeRequest,
} = require('../../models');
const { getMonthlySummary } = require('./payrollMonthlySummaryService');
const { assertPayrollPeriodOpen } = require('./payrollRunGuard');

const DAYS_IN_MONTH = 30;
const HOURS_PER_DAY = 8;

const PRORATE_CODES = new Set(['BASIC', 'HOUSING', 'TRANSPORT', 'FOOD', 'ALLOWANCE']);
const OT_CODES = new Set(['OVERTIME', 'OT']);

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function resolveCalcMethod(component) {
  if (component?.calculationMethod) return component.calculationMethod;
  const code = (component?.componentCode || '').toUpperCase();
  if (OT_CODES.has(code)) return 'OVERTIME_HOURLY';
  if (PRORATE_CODES.has(code) || component?.recurring) return 'PRORATE';
  return 'FIXED_MONTHLY';
}

async function getEffectiveSalaryStructure(companyId, employeeId, toDate) {
  const structures = await EmployeeSalaryStructure.findAll({
    where: {
      companyId,
      employeeId,
      status: 'active',
      effectiveFrom: { [Op.lte]: toDate },
      [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: toDate } }],
    },
    include: [
      {
        model: EmployeeSalaryLine,
        as: 'lines',
        include: [{ model: PayrollComponent, as: 'component' }],
      },
    ],
    order: [['effectiveFrom', 'DESC']],
    limit: 1,
  });
  return structures[0] || null;
}

function getBasicAmount(structure) {
  if (!structure?.lines) return 0;
  for (const line of structure.lines) {
    const code = (line.component?.componentCode || '').toUpperCase();
    if (code === 'BASIC' || line.lineDescription?.toLowerCase().includes('basic')) {
      return Number(line.amount) || 0;
    }
  }
  if (structure.lines[0]) return Number(structure.lines[0].amount) || 0;
  return 0;
}

async function getApprovedOvertimeHours(companyId, employeeId, fromDate, toDate) {
  const rows = await PayrollOvertimeRequest.findAll({
    where: {
      companyId,
      employeeId,
      status: 'APPROVED',
      workDate: { [Op.between]: [fromDate, toDate] },
    },
  });
  return rows.reduce((s, r) => s + Number(r.approvedHours ?? r.requestedHours ?? 0), 0);
}

async function calculateEmployeePayroll({
  companyId,
  employee,
  period,
  payrollRunId,
  exceptions,
}) {
  const summaries = await getMonthlySummary(companyId, {
    month: period.periodMonth,
    year: period.periodYear,
    employee_id: employee.id,
  });
  const att = summaries[0];
  if (!att) {
    exceptions.push({ employeeId: employee.id, employeeName: employee.employeeName, issue: 'Missing attendance summary' });
    return null;
  }

  const payableDays = Number(att.payable_days) || 0;
  const workingDays = Number(att.working_days) || 0;
  if (workingDays <= 0) {
    exceptions.push({ employeeId: employee.id, employeeName: employee.employeeName, issue: 'Working days is zero' });
    return null;
  }

  const structure = await getEffectiveSalaryStructure(companyId, employee.id, period.toDate);
  if (!structure) {
    exceptions.push({ employeeId: employee.id, employeeName: employee.employeeName, issue: 'Missing salary structure' });
    return null;
  }

  const prorationFactor = payableDays / workingDays;
  const basicAmount = getBasicAmount(structure);
  const lines = [];
  let gross = 0;
  let deductions = 0;

  for (const sl of structure.lines || []) {
    const comp = sl.component;
    const base = Number(sl.amount) || 0;
    const method = resolveCalcMethod(comp);
    const compType = comp?.componentType || 'EARNING';
    let calculated = base;

    if (compType === 'EARNING' && method === 'PRORATE') {
      calculated = round2(base * prorationFactor);
    }

    const line = {
      componentId: comp?.id || null,
      componentType: compType,
      calculationMethod: method,
      calculatedAmount: calculated,
      baseAmount: base,
      formulaSnapshot: { prorationFactor, payableDays, workingDays },
    };
    lines.push(line);

    if (compType === 'EARNING') gross += calculated;
    else if (compType === 'DEDUCTION') deductions += calculated;
  }

  const otHours = await getApprovedOvertimeHours(companyId, employee.id, period.fromDate, period.toDate);
  const otFromAtt = Number(att.overtime_hours) || 0;
  const totalOtHours = Math.max(otHours, otFromAtt);

  if (totalOtHours > 0) {
    const otComp = await PayrollComponent.findOne({
      where: {
        companyId,
        status: 'active',
        componentCode: { [Op.in]: ['OVERTIME', 'OT', 'Overtime'] },
      },
    });
    const multiplier = Number(otComp?.overtimeMultiplier) || 1.5;
    const hourlyRate = basicAmount / DAYS_IN_MONTH / HOURS_PER_DAY;
    const otAmount = round2(totalOtHours * hourlyRate * multiplier);
    lines.push({
      componentId: otComp?.id || null,
      componentType: 'EARNING',
      calculationMethod: 'OVERTIME_HOURLY',
      calculatedAmount: otAmount,
      baseAmount: basicAmount,
      formulaSnapshot: { totalOtHours, hourlyRate, multiplier },
    });
    gross += otAmount;
  }

  const adjustments = await PayrollMonthlyAdjustment.findAll({
    where: {
      companyId,
      employeeId: employee.id,
      payrollPeriodId: period.id,
      status: 'APPROVED',
    },
    include: [{ model: PayrollComponent, as: 'component' }],
  });

  for (const adj of adjustments) {
    const amt = Number(adj.amount) || 0;
    if (adj.adjustmentType === 'ADDITION') {
      lines.push({
        componentId: adj.componentId,
        componentType: 'EARNING',
        calculationMethod: 'ADJUSTMENT',
        calculatedAmount: amt,
        baseAmount: amt,
        formulaSnapshot: { adjustmentId: adj.id },
      });
      gross += amt;
    } else {
      lines.push({
        componentId: adj.componentId,
        componentType: 'DEDUCTION',
        calculationMethod: 'ADJUSTMENT',
        calculatedAmount: amt,
        baseAmount: amt,
        formulaSnapshot: { adjustmentId: adj.id },
      });
      deductions += amt;
    }
  }

  const unpaidDays = Number(att.unpaid_leave_days) || 0;
  if (unpaidDays > 0 && workingDays > 0) {
    const unpaidDed = round2((basicAmount / workingDays) * unpaidDays);
    lines.push({
      componentId: null,
      componentType: 'DEDUCTION',
      calculationMethod: 'UNPAID_LEAVE',
      calculatedAmount: unpaidDed,
      baseAmount: basicAmount,
      formulaSnapshot: { unpaidDays },
    });
    deductions += unpaidDed;
  }

  const installments = await EmployeeLoanInstallment.findAll({
    where: {
      companyId,
      status: 'APPROVED',
      duePeriodMonth: period.periodMonth,
      duePeriodYear: period.periodYear,
    },
    include: [{ model: EmployeeLoan, as: 'loan', where: { employeeId: employee.id }, required: true }],
  });

  for (const inst of installments) {
    const amt = Number(inst.installmentAmount) || 0;
    lines.push({
      componentId: null,
      componentType: 'DEDUCTION',
      calculationMethod: 'LOAN_RECOVERY',
      calculatedAmount: amt,
      baseAmount: amt,
      formulaSnapshot: { installmentId: inst.id },
    });
    deductions += amt;
  }

  const net = round2(gross - deductions);
  if (net < 0) {
    exceptions.push({ employeeId: employee.id, employeeName: employee.employeeName, issue: 'Negative net salary' });
  }

  const runEmp = await PayrollRunEmployee.create({
    companyId,
    payrollRunId,
    employeeId: employee.id,
    salaryStructureSnapshot: structure.toJSON ? structure.toJSON() : structure,
    attendanceSnapshot: att,
    payableDays,
    workingDays,
    grossSalary: gross,
    deductions,
    netSalary: net,
    status: net < 0 ? 'EXCEPTION' : 'CALCULATED',
  });

  for (const ln of lines) {
    await PayrollRunComponentLine.create({
      companyId,
      payrollRunEmployeeId: runEmp.id,
      ...ln,
    });
  }

  return { gross, deductions, net };
}

async function generatePayroll({ companyId, payrollRunId, userId }) {
  const run = await PayrollRun.findOne({
    where: { id: payrollRunId, companyId },
    include: [{ model: PayrollPeriod, as: 'payrollPeriod' }],
  });
  if (!run) {
    const err = new Error('Payroll run not found');
    err.statusCode = 404;
    throw err;
  }
  if (!['DRAFT', 'CALCULATED', 'UNDER_REVIEW'].includes(run.status)) {
    const err = new Error('Run cannot be recalculated in current status');
    err.statusCode = 400;
    throw err;
  }

  const period = run.payrollPeriod || (await assertPayrollPeriodOpen(run.payrollPeriodId, companyId));

  await PayrollRunEmployee.destroy({ where: { payrollRunId: run.id, companyId } });

  const employees = await Employee.findAll({ where: { companyId, status: 'active' } });
  const exceptions = [];
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;
  let processed = 0;

  for (const emp of employees) {
    const result = await calculateEmployeePayroll({
      companyId,
      employee: emp,
      period,
      payrollRunId: run.id,
      exceptions,
    });
    if (result) {
      totalGross += result.gross;
      totalDeductions += result.deductions;
      totalNet += result.net;
      processed += 1;
    }
  }

  await run.update({
    status: 'CALCULATED',
    totalEmployees: processed,
    totalGross: round2(totalGross),
    totalDeductions: round2(totalDeductions),
    totalNet: round2(totalNet),
  });

  return { run, exceptions, processed };
}

module.exports = {
  generatePayroll,
  calculateEmployeePayroll,
  round2,
  resolveCalcMethod,
  getEffectiveSalaryStructure,
  getBasicAmount,
  DAYS_IN_MONTH,
  HOURS_PER_DAY,
};
