const { Op } = require('sequelize');
const {
  Employee,
  PayrollAttendancePeriod,
  PayrollAttendanceDailySummary,
  PayrollRun,
  PayrollRunEmployee,
  PayrollRunComponentLine,
  PayrollWpsConfiguration,
  PayrollWpsBatch,
  PayrollWpsEmployeeLine,
  EmployeeSeparation,
  PayrollFinalSettlement,
  PayrollFinalSettlementLine,
  AccountsTrans,
  PayrollPayslip,
  PayrollExport,
} = require('../../../models');
const { DEMO_PREFIX, PERIOD_MONTH, PERIOD_YEAR } = require('../constants');

function pass(msg) {
  return { pass: true, message: msg };
}
function fail(msg) {
  return { pass: false, message: msg };
}

async function checkCompanyIsolation(ctx) {
  const demo = await Employee.findAll({
    where: { employeeNo: { [Op.like]: `${DEMO_PREFIX}%` } },
    attributes: ['id', 'employeeNo', 'companyId'],
  });
  const wrong = demo.filter((e) => e.companyId !== ctx.companyId);
  const otherCos = await Employee.count({
    where: {
      employeeNo: { [Op.like]: `${DEMO_PREFIX}%` },
      companyId: { [Op.ne]: ctx.companyId },
    },
  });
  if (wrong.length || otherCos > 0) {
    return fail(`${wrong.length} demo employees on wrong company; ${otherCos} on other companies`);
  }
  return pass(`${demo.length} demo employees scoped to company ${ctx.companyId}`);
}

async function checkAttendance(ctx) {
  const period = await PayrollAttendancePeriod.findOne({
    where: { companyId: ctx.companyId, periodMonth: PERIOD_MONTH, periodYear: PERIOD_YEAR },
  });
  if (!period || period.status !== 'LOCKED') {
    return fail(`Attendance period not LOCKED (status=${period?.status || 'missing'})`);
  }
  const summaryCount = await PayrollAttendanceDailySummary.count({
    where: { companyId: ctx.companyId },
  });
  if (summaryCount < 10) return fail(`Too few daily summaries (${summaryCount})`);
  return pass(`Attendance LOCKED; ${summaryCount} daily summaries`);
}

async function checkPayrollRun(ctx) {
  const run = await PayrollRun.findOne({
    where: {
      companyId: ctx.companyId,
      status: 'LOCKED',
    },
    order: [['id', 'DESC']],
  });
  if (!run) return fail('No LOCKED payroll run');
  const reCount = await PayrollRunEmployee.count({
    where: { companyId: ctx.companyId, payrollRunId: run.id },
  });
  if (reCount < 10) return fail(`Too few run employees (${reCount})`);
  const negatives = await PayrollRunEmployee.count({
    where: { companyId: ctx.companyId, payrollRunId: run.id, netSalary: { [Op.lt]: 0 } },
  });
  if (negatives > 0) return fail(`${negatives} employees with negative net`);
  const reIds = (
    await PayrollRunEmployee.findAll({
      where: { companyId: ctx.companyId, payrollRunId: run.id },
      attributes: ['id'],
    })
  ).map((r) => r.id);
  const lines = await PayrollRunComponentLine.count({
    where: { companyId: ctx.companyId, payrollRunEmployeeId: { [Op.in]: reIds } },
  });
  if (lines < reCount) return fail('Missing component lines on run');
  ctx.handles.validatedRunId = run.id;
  return pass(`Run LOCKED; ${reCount} employees; component lines present`);
}

async function checkWps(ctx) {
  const config = await PayrollWpsConfiguration.findOne({
    where: { companyId: ctx.companyId, status: 'ACTIVE' },
  });
  if (!config) return fail('WPS configuration missing');
  const batch = await PayrollWpsBatch.findOne({
    where: { companyId: ctx.companyId, status: 'EXPORTED' },
    order: [['id', 'DESC']],
  });
  if (!batch) return fail('No EXPORTED WPS batch');
  const lines = await PayrollWpsEmployeeLine.findAll({
    where: { companyId: ctx.companyId, batchId: batch.id },
  });
  const validTotal = lines
    .filter((l) => l.validationStatus !== 'ERROR')
    .reduce((s, l) => s + Number(l.salaryAmount || 0), 0);
  const batchAmt = Number(batch.totalAmount || 0);
  if (Math.abs(validTotal - batchAmt) > 0.05) {
    return fail(`WPS totals mismatch batch=${batchAmt} lines=${validTotal}`);
  }
  return pass(`WPS EXPORTED; batch total AED ${batchAmt}`);
}

async function checkSettlement(ctx) {
  const sepEmp = await Employee.findOne({
    where: { companyId: ctx.companyId, employeeNo: `${DEMO_PREFIX}SEP` },
  });
  if (!sepEmp) return fail('DEMO-CRE-SEP employee missing');
  const sep = await EmployeeSeparation.findOne({
    where: { companyId: ctx.companyId, employeeId: sepEmp.id, status: 'APPROVED' },
  });
  if (!sep) return fail('Separation for DEMO-CRE-SEP not APPROVED');
  const settlement = await PayrollFinalSettlement.findOne({
    where: { companyId: ctx.companyId, separationId: sep.id, status: 'LOCKED' },
    include: [{ model: PayrollFinalSettlementLine, as: 'lines' }],
  });
  if (!settlement) return fail('Final settlement not LOCKED');
  if (!settlement.lines?.length) return fail('Settlement has no lines');
  if (Number(settlement.netSettlement) < 0) return fail('Settlement net negative');
  return pass(`Settlement LOCKED; net=${settlement.netSettlement}`);
}

async function checkFinance(ctx) {
  const run = await PayrollRun.findOne({
    where: { companyId: ctx.companyId, financePostingStatus: 'POSTED' },
    order: [['id', 'DESC']],
  });
  if (!run) return fail('Payroll run not POSTED to finance');
  const settlement = await PayrollFinalSettlement.findOne({
    where: { companyId: ctx.companyId, financePostingStatus: 'POSTED' },
    order: [['id', 'DESC']],
  });
  if (!settlement) return fail('Settlement not POSTED to finance');

  const runTrans = await AccountsTrans.findAll({
    where: { companyId: ctx.companyId, payrollRunId: run.id },
  });
  if (!runTrans.length) return fail('No GL lines for payroll run');
  const debits = runTrans.reduce((s, r) => s + Number(r.debit || 0), 0);
  const credits = runTrans.reduce((s, r) => s + Number(r.credit || 0), 0);
  if (Math.abs(debits - credits) > 0.02) {
    return fail(`Run GL unbalanced debits=${debits} credits=${credits}`);
  }

  const stlTrans = await AccountsTrans.findAll({
    where: { companyId: ctx.companyId, payrollSettlementId: settlement.id },
  });
  if (!stlTrans.length) return fail('No GL lines for settlement');
  const d2 = stlTrans.reduce((s, r) => s + Number(r.debit || 0), 0);
  const c2 = stlTrans.reduce((s, r) => s + Number(r.credit || 0), 0);
  if (Math.abs(d2 - c2) > 0.02) {
    return fail(`Settlement GL unbalanced debits=${d2} credits=${c2}`);
  }
  return pass('Run and settlement POSTED; GL balanced');
}

async function checkDocuments(ctx) {
  const payslipCount = await PayrollPayslip.count({
    where: {
      companyId: ctx.companyId,
      status: 'PUBLISHED',
      pdfPath: { [Op.ne]: null },
      documentSnapshot: { [Op.ne]: null },
    },
  });
  if (payslipCount < 1) return fail('No PUBLISHED payslips with PDF');
  const exportCount = await PayrollExport.count({
    where: { companyId: ctx.companyId, exportType: { [Op.in]: ['payroll_register', 'payslip_register'] } },
  });
  if (exportCount < 1) return fail('Payroll exports missing');
  return pass(`${payslipCount} published payslips; exports=${exportCount}`);
}

async function runAllValidations(ctx) {
  const sections = [
    { name: 'Company isolation', fn: checkCompanyIsolation },
    { name: 'Attendance', fn: checkAttendance },
    { name: 'Payroll run', fn: checkPayrollRun },
    { name: 'WPS', fn: checkWps },
    { name: 'Settlement', fn: checkSettlement },
    { name: 'Finance', fn: checkFinance },
    { name: 'Documents', fn: checkDocuments },
  ];
  const results = [];
  let overallPass = true;
  for (const s of sections) {
    let r;
    try {
      r = await s.fn(ctx);
    } catch (e) {
      r = fail(e.message);
    }
    results.push({ name: s.name, ...r });
    if (!r.pass) overallPass = false;
  }
  return { results, overallPass };
}

module.exports = { runAllValidations };
