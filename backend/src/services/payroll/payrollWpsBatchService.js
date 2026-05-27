const { Op } = require('sequelize');
const {
  PayrollRun,
  PayrollPeriod,
  PayrollRunEmployee,
  PayrollWpsBatch,
  PayrollWpsEmployeeLine,
  PayrollWpsSifExport,
  PayrollWpsConfiguration,
  Employee,
  CompanySetting,
} = require('../../models');
const {
  validatePayrollCompliance,
  validateEmployeeWpsLine,
  hasBlockingErrors,
  getPrimaryBank,
  getLabourCardFromDocs,
} = require('./payrollComplianceService');
const { generateSifContent, buildFileName } = require('./payrollSIFGeneratorService');
const { assertBatchNotExported } = require('./payrollWpsBatchGuard');

const ACTIVE_BATCH_STATUSES = ['DRAFT', 'GENERATED', 'UNDER_REVIEW', 'APPROVED', 'EXPORTED'];

async function assertNoActiveBatch(companyId, payrollRunId) {
  const existing = await PayrollWpsBatch.findOne({
    where: {
      companyId,
      payrollRunId,
      status: { [Op.notIn]: ['CANCELLED'] },
    },
  });
  if (existing) {
    const err = new Error('An active WPS batch already exists for this payroll run');
    err.statusCode = 400;
    throw err;
  }
}

async function generateWpsBatch({ companyId, payrollRunId, userId }) {
  const run = await PayrollRun.findOne({
    where: { id: payrollRunId, companyId },
    include: [{ model: PayrollPeriod, as: 'payrollPeriod' }],
  });
  if (!run) {
    const err = new Error('Payroll run not found');
    err.statusCode = 404;
    throw err;
  }
  if (!['APPROVED', 'LOCKED'].includes(run.status)) {
    const err = new Error('Payroll run must be APPROVED or LOCKED');
    err.statusCode = 400;
    throw err;
  }

  const compliance = await validatePayrollCompliance({ companyId, payrollRunId });
  if (hasBlockingErrors(compliance.issues)) {
    const err = new Error('Compliance validation failed');
    err.statusCode = 400;
    err.compliance = compliance;
    throw err;
  }

  await assertNoActiveBatch(companyId, payrollRunId);

  const wpsConfig = await PayrollWpsConfiguration.findOne({
    where: { companyId, status: 'ACTIVE' },
    order: [['id', 'DESC']],
  });

  const period = run.payrollPeriod;
  const salaryMonth = period?.periodMonth || new Date().getMonth() + 1;
  const salaryYear = period?.periodYear || new Date().getFullYear();

  const lastBatch = await PayrollWpsBatch.findOne({
    where: { companyId, payrollRunId },
    order: [['batchNumber', 'DESC']],
  });

  const batch = await PayrollWpsBatch.create({
    companyId,
    payrollRunId,
    batchNumber: (lastBatch?.batchNumber || 0) + 1,
    salaryMonth,
    salaryYear,
    status: 'GENERATED',
    generatedBy: userId,
    totalEmployees: 0,
    totalAmount: 0,
  });

  const runEmployees = await PayrollRunEmployee.findAll({
    where: { companyId, payrollRunId },
    include: [{ model: Employee, as: 'employee' }],
  });

  let totalAmount = 0;
  let totalEmployees = 0;

  for (const re of runEmployees) {
    const net = Number(re.netSalary || 0);
    if (net <= 0) continue;

    const emp = re.employee;
    if (!emp) continue;

    const bank = await getPrimaryBank(companyId, emp.id);
    let labourCard = bank?.labourCardNo;
    if (!labourCard) {
      labourCard = await getLabourCardFromDocs(companyId, emp.id);
    }

    const lineValidation = validateEmployeeWpsLine(emp, bank, re, wpsConfig);

    await PayrollWpsEmployeeLine.create({
      companyId,
      batchId: batch.id,
      employeeId: emp.id,
      employeeNo: emp.employeeNo,
      employeeName: emp.employeeName,
      labourCardNo: labourCard,
      iban: bank?.iban || null,
      salaryAmount: net,
      salaryType: wpsConfig?.defaultSalaryType || 'BASIC',
      validationStatus: lineValidation.status,
      remarks: lineValidation.issues.map((i) => i.message).join('; ').slice(0, 255) || null,
    });

    if (lineValidation.status !== 'ERROR') {
      totalAmount += net;
      totalEmployees += 1;
    }
  }

  await batch.update({ totalEmployees, totalAmount: Math.round(totalAmount * 100) / 100 });
  return { batch, compliance };
}

async function getBatchWithLines(companyId, batchId) {
  return PayrollWpsBatch.findOne({
    where: { id: batchId, companyId },
    include: [
      { model: PayrollRun, as: 'payrollRun' },
      { model: PayrollWpsEmployeeLine, as: 'lines' },
    ],
  });
}

async function reviewBatch(companyId, batchId) {
  const batch = await getBatchWithLines(companyId, batchId);
  if (!batch) {
    const err = new Error('Batch not found');
    err.statusCode = 404;
    throw err;
  }
  assertBatchNotExported(batch);
  if (!['GENERATED', 'DRAFT'].includes(batch.status)) {
    const err = new Error(`Cannot review batch in status ${batch.status}`);
    err.statusCode = 400;
    throw err;
  }
  await batch.update({ status: 'UNDER_REVIEW' });
  return batch;
}

async function approveBatch(companyId, batchId, userId) {
  const batch = await getBatchWithLines(companyId, batchId);
  if (!batch) {
    const err = new Error('Batch not found');
    err.statusCode = 404;
    throw err;
  }
  assertBatchNotExported(batch);
  if (batch.status !== 'UNDER_REVIEW' && batch.status !== 'GENERATED') {
    const err = new Error('Batch must be UNDER_REVIEW or GENERATED to approve');
    err.statusCode = 400;
    throw err;
  }
  const errorLines = (batch.lines || []).filter((l) => l.validationStatus === 'ERROR');
  if (errorLines.length > 0) {
    const err = new Error('Cannot approve batch with ERROR validation lines');
    err.statusCode = 400;
    throw err;
  }
  await batch.update({ status: 'APPROVED', approvedBy: userId });
  return batch;
}

async function exportBatch(companyId, batchId, userId) {
  const batch = await getBatchWithLines(companyId, batchId);
  if (!batch) {
    const err = new Error('Batch not found');
    err.statusCode = 404;
    throw err;
  }
  if (batch.status === 'EXPORTED') {
    const err = new Error('Batch already exported');
    err.statusCode = 400;
    throw err;
  }
  if (batch.status !== 'APPROVED') {
    const err = new Error('Batch must be APPROVED before export');
    err.statusCode = 400;
    throw err;
  }

  const wpsConfig = await PayrollWpsConfiguration.findOne({
    where: { companyId, status: 'ACTIVE' },
    order: [['id', 'DESC']],
  });
  const company = await CompanySetting.findByPk(companyId);
  const companyName = company?.companyName || company?.name || 'Company';

  const exportable = (batch.lines || []).filter((l) =>
    ['VALID', 'WARNING'].includes(l.validationStatus)
  );
  const enriched = [];
  for (const line of exportable) {
    const bank = await getPrimaryBank(companyId, line.employeeId);
    enriched.push({
      ...line.toJSON(),
      molPersonalId: bank?.molPersonalId || '',
      bankName: bank?.bankName || '',
    });
  }
  const content = generateSifContent({
    batch,
    wpsConfig,
    companyName,
    lines: enriched,
  });

  const fileName = buildFileName(batch);
  const totalAmount = exportable.reduce((s, l) => s + Number(l.salaryAmount || 0), 0);

  await PayrollWpsSifExport.create({
    companyId,
    batchId: batch.id,
    fileName,
    sifContent: content,
    employeeCount: exportable.length,
    totalAmount: Math.round(totalAmount * 100) / 100,
    exportedBy: userId,
    exportedAt: new Date(),
  });

  await batch.update({ status: 'EXPORTED', exportedAt: new Date() });

  return { fileName, content, batch, employeeCount: exportable.length, totalAmount };
}

async function cancelBatch(companyId, batchId) {
  const batch = await PayrollWpsBatch.findOne({ where: { id: batchId, companyId } });
  if (!batch) {
    const err = new Error('Batch not found');
    err.statusCode = 404;
    throw err;
  }
  assertBatchNotExported(batch);
  await batch.update({ status: 'CANCELLED' });
  return batch;
}

module.exports = {
  generateWpsBatch,
  getBatchWithLines,
  reviewBatch,
  approveBatch,
  exportBatch,
  cancelBatch,
  assertNoActiveBatch,
};
