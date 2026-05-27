const { Op } = require('sequelize');
const {
  PayrollRun,
  PayrollPeriod,
  PayrollRunEmployee,
  PayrollRunComponentLine,
  PayrollComponent,
  PayrollPayslip,
  PayrollBatchJob,
} = require('../../models');
const { companyWhere } = require('../../utils/companyScope');
const { maskIban, renderAndSavePdf } = require('./payrollDocumentRender.service');

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function employeeFromSnapshot(snap) {
  if (!snap || typeof snap !== 'object') return {};
  return {
    employeeNo: snap.employeeNo || snap.employee_no || '',
    employeeName: snap.employeeName || snap.employee_name || '',
    department: snap.department || snap.departmentName || '',
    designation: snap.designation || snap.designationName || '',
    bankName: snap.bankName || snap.bank_name || '',
    iban: snap.iban || snap.IBAN || '',
  };
}

function buildPayslipSnapshot(runEmployee, run, period) {
  const snap = runEmployee.salaryStructureSnapshot || {};
  const emp = employeeFromSnapshot(snap);
  const lines = (runEmployee.lines || []).map((l) => ({
    componentType: l.componentType,
    componentCode: l.component?.componentCode || l.calculationMethod || 'OTHER',
    componentName: l.component?.componentName || l.calculationMethod || 'Component',
    amount: round2(l.calculatedAmount),
  }));

  const earnings = lines.filter((l) => l.componentType === 'EARNING');
  const deductions = lines.filter((l) => l.componentType === 'DEDUCTION');

  return {
    frozenAt: runEmployee.updatedAt || run.updatedAt,
    payrollRunId: run.id,
    runNumber: run.runNumber,
    periodLabel: period
      ? `${period.periodYear}-${String(period.periodMonth).padStart(2, '0')}`
      : '',
    employee: {
      ...emp,
      ibanMasked: maskIban(emp.iban),
    },
    payableDays: runEmployee.payableDays,
    workingDays: runEmployee.workingDays,
    earnings,
    deductions,
    grossSalary: round2(runEmployee.grossSalary),
    totalDeductions: round2(runEmployee.deductions),
    netSalary: round2(runEmployee.netSalary),
  };
}

function snapshotToPdfSections(snapshot, payslipNumber) {
  const earnRows = (snapshot.earnings || []).map((e) => [
    e.componentName,
    String(e.amount),
  ]);
  const dedRows = (snapshot.deductions || []).map((d) => [
    d.componentName,
    String(d.amount),
  ]);

  return {
    headerVars: { payslipNumber, period: snapshot.periodLabel },
    blocks: [
      {
        heading: 'Employee',
        lines: [
          `No: ${snapshot.employee.employeeNo}`,
          `Name: ${snapshot.employee.employeeName}`,
          `Department: ${snapshot.employee.department}`,
          `Designation: ${snapshot.employee.designation}`,
          `Bank: ${snapshot.employee.bankName}`,
          `IBAN: ${snapshot.employee.ibanMasked}`,
        ],
      },
      {
        heading: 'Earnings',
        table: { headers: ['Component', 'Amount'], rows: earnRows },
      },
      {
        heading: 'Deductions',
        table: { headers: ['Component', 'Amount'], rows: dedRows },
      },
    ],
    summary: [
      `Gross: ${snapshot.grossSalary}`,
      `Deductions: ${snapshot.totalDeductions}`,
      `Net Pay: ${snapshot.netSalary}`,
    ],
  };
}

async function loadRunEmployee(companyId, payrollRunEmployeeId) {
  const re = await PayrollRunEmployee.findOne({
    where: { id: payrollRunEmployeeId, companyId },
    include: [
      {
        model: PayrollRunComponentLine,
        as: 'lines',
        include: [{ model: PayrollComponent, as: 'component' }],
      },
      {
        model: PayrollRun,
        as: 'payrollRun',
        required: true,
        include: [{ model: PayrollPeriod, as: 'payrollPeriod' }],
      },
    ],
  });
  if (!re) {
    const err = new Error('Payroll run employee not found');
    err.statusCode = 404;
    throw err;
  }
  const run = re.payrollRun;
  if (!run || run.status !== 'LOCKED') {
    const err = new Error('Payroll run must be LOCKED to generate payslips');
    err.statusCode = 400;
    throw err;
  }
  return re;
}

async function generatePayslip({ req, payrollRunEmployeeId }) {
  const re = await loadRunEmployee(req.companyId, payrollRunEmployeeId);
  const run = re.payrollRun;
  const period = run.payrollPeriod;

  const existing = await PayrollPayslip.findOne({
    where: {
      companyId: req.companyId,
      payrollRunEmployeeId: re.id,
      status: { [Op.in]: ['GENERATED', 'PUBLISHED'] },
    },
  });
  if (existing?.status === 'PUBLISHED') {
    const err = new Error('Published payslip cannot be regenerated; void first');
    err.statusCode = 400;
    throw err;
  }

  const snapshot = buildPayslipSnapshot(re, run, period);
  const payslipNumber = `PS-${run.id}-${re.employeeId}`;
  const fileName = `${payslipNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
  const { relativePath: pdfPath } = await renderAndSavePdf({
    companyId: req.companyId,
    documentType: 'PAYSLIP',
    fileName,
    title: `Payslip ${snapshot.periodLabel}`,
    sections: snapshotToPdfSections(snapshot, payslipNumber),
  });

  const payload = {
    companyId: req.companyId,
    payrollRunEmployeeId: re.id,
    employeeId: re.employeeId,
    payrollPeriodId: run.payrollPeriodId,
    payslipNumber,
    grossSalary: snapshot.grossSalary,
    deductions: snapshot.totalDeductions,
    netSalary: snapshot.netSalary,
    generatedAt: new Date(),
    generatedBy: req.user?.id,
    status: 'GENERATED',
    pdfPath,
    documentSnapshot: snapshot,
  };

  let payslip;
  if (existing) {
    await existing.update(payload);
    payslip = existing;
  } else {
    payslip = await PayrollPayslip.create(payload);
  }
  return payslip;
}

async function generateBatchPayslips({ req, payrollRunId }) {
  const run = await PayrollRun.findOne({
    where: { id: payrollRunId, ...companyWhere(req) },
  });
  if (!run) {
    const err = new Error('Payroll run not found');
    err.statusCode = 404;
    throw err;
  }
  if (run.status !== 'LOCKED') {
    const err = new Error('Payroll run must be LOCKED');
    err.statusCode = 400;
    throw err;
  }

  const employees = await PayrollRunEmployee.findAll({
    where: { payrollRunId: run.id, companyId: req.companyId },
  });

  const job = await PayrollBatchJob.create({
    companyId: req.companyId,
    jobType: 'PAYSLIP_BATCH',
    payrollRunId: run.id,
    total: employees.length,
    processed: 0,
    status: 'RUNNING',
  });

  let processed = 0;
  let lastError = null;
  try {
    for (const re of employees) {
      try {
        await generatePayslip({ req, payrollRunEmployeeId: re.id });
        processed += 1;
        await job.update({ processed });
      } catch (e) {
        lastError = e.message;
      }
    }
    await job.update({
      processed,
      status: processed === employees.length ? 'COMPLETED' : 'FAILED',
      errorMessage: lastError,
    });
  } catch (e) {
    await job.update({ status: 'FAILED', errorMessage: e.message });
    throw e;
  }

  return job;
}

async function publishPayslips({ req, payrollRunId }) {
  const run = await PayrollRun.findOne({
    where: { id: payrollRunId, ...companyWhere(req) },
  });
  if (!run) {
    const err = new Error('Payroll run not found');
    err.statusCode = 404;
    throw err;
  }

  const [count] = await PayrollPayslip.update(
    { status: 'PUBLISHED' },
    {
      where: {
        companyId: req.companyId,
        status: 'GENERATED',
        payrollRunEmployeeId: {
          [Op.in]: (
            await PayrollRunEmployee.findAll({
              where: { payrollRunId: run.id, companyId: req.companyId },
              attributes: ['id'],
            })
          ).map((r) => r.id),
        },
      },
    }
  );
  return { published: count };
}

async function voidPayslip({ req, payslipId, allowPublished = false }) {
  const payslip = await PayrollPayslip.findOne({
    where: { id: payslipId, ...companyWhere(req) },
  });
  if (!payslip) {
    const err = new Error('Payslip not found');
    err.statusCode = 404;
    throw err;
  }
  if (payslip.status === 'PUBLISHED' && !allowPublished) {
    const err = new Error('Published payslips require publish permission to void');
    err.statusCode = 403;
    throw err;
  }
  await payslip.update({ status: 'VOID' });
  return payslip;
}

async function listPayslips(req, query = {}) {
  const where = { ...companyWhere(req) };
  if (query.run_id) {
    const reIds = (
      await PayrollRunEmployee.findAll({
        where: { payrollRunId: query.run_id, companyId: req.companyId },
        attributes: ['id'],
      })
    ).map((r) => r.id);
    where.payrollRunEmployeeId = { [Op.in]: reIds };
  }
  if (query.status) where.status = query.status;
  return PayrollPayslip.findAll({ where, order: [['id', 'DESC']], limit: 200 });
}

module.exports = {
  buildPayslipSnapshot,
  generatePayslip,
  generateBatchPayslips,
  publishPayslips,
  voidPayslip,
  listPayslips,
};
