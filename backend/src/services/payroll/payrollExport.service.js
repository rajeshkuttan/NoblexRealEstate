const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { Op } = require('sequelize');
const {
  PayrollRun,
  PayrollRunEmployee,
  PayrollRunComponentLine,
  PayrollComponent,
  PayrollPeriod,
  Employee,
  PayrollPayslip,
  PayrollExport,
  PayrollFinalSettlement,
  EmployeeLedgerHeader,
  EmployeeLedgerLine,
  EmployeeLoan,
} = require('../../models');
const { companyWhere } = require('../../utils/companyScope');
const { getDocumentsDir, relativePath } = require('./payrollDocumentPaths');
const { renderAndSavePdf } = require('./payrollDocumentRender.service');

const REPORT_TYPES = [
  'payroll_register',
  'payroll_variance',
  'wps_register',
  'settlement_register',
  'employee_ledger',
  'attendance_summary',
  'loan_report',
  'eos_liability',
  'payslip_register',
  'certificate_register',
];

async function fetchRegisterRows(companyId, params) {
  const where = { companyId };
  if (params.run_id) where.payrollRunId = params.run_id;
  const rows = await PayrollRunEmployee.findAll({
    where,
    include: [
      { model: Employee, as: 'employee', attributes: ['employeeNo', 'employeeName'] },
      {
        model: PayrollRunComponentLine,
        as: 'lines',
        include: [{ model: PayrollComponent, as: 'component' }],
      },
      { model: PayrollRun, as: 'payrollRun' },
    ],
    limit: 500,
  });
  return rows.map((re) => ({
    employee_no: re.employee?.employeeNo,
    employee_name: re.employee?.employeeName,
    gross: Number(re.grossSalary),
    deductions: Number(re.deductions),
    net: Number(re.netSalary),
    run: re.payrollRun?.runNumber,
  }));
}

async function fetchPayslipRegister(companyId) {
  const rows = await PayrollPayslip.findAll({
    where: { companyId },
    order: [['id', 'DESC']],
    limit: 500,
  });
  return rows.map((p) => ({
    payslip_number: p.payslipNumber,
    employee_id: p.employeeId,
    gross: Number(p.grossSalary),
    net: Number(p.netSalary),
    status: p.status,
    generated_at: p.generatedAt,
  }));
}

async function fetchCertificateRegister(companyId) {
  const rows = await PayrollExport.findAll({
    where: { companyId, exportType: { [Op.like]: 'CERT_%' } },
    order: [['id', 'DESC']],
    limit: 200,
  });
  return rows.map((r) => ({
    type: r.exportType,
    format: r.format,
    generated_at: r.generatedAt,
  }));
}

async function fetchLoanReport(companyId) {
  const loans = await EmployeeLoan.findAll({ where: { companyId, status: 'ACTIVE' }, limit: 500 });
  return loans.map((l) => ({
    employee_id: l.employeeId,
    balance: Number(l.balance),
    status: l.status,
  }));
}

async function fetchSettlementRegister(companyId) {
  const rows = await PayrollFinalSettlement.findAll({
    where: { companyId, status: { [Op.ne]: 'CANCELLED' } },
    limit: 200,
  });
  return rows.map((s) => ({
    settlement_number: s.settlementNumber,
    employee_id: s.employeeId,
    net: Number(s.netSettlement),
    status: s.status,
  }));
}

async function getReportData(companyId, reportType, params) {
  switch (reportType) {
    case 'payroll_register':
      return fetchRegisterRows(companyId, params);
    case 'payslip_register':
      return fetchPayslipRegister(companyId);
    case 'certificate_register':
      return fetchCertificateRegister(companyId);
    case 'loan_report':
      return fetchLoanReport(companyId);
    case 'settlement_register':
      return fetchSettlementRegister(companyId);
    case 'employee_ledger': {
      const headers = await EmployeeLedgerHeader.findAll({
        where: { companyId },
        include: [{ model: EmployeeLedgerLine, as: 'lines' }],
        limit: 100,
      });
      return headers.map((h) => ({
        employee_id: h.employeeId,
        line_count: (h.lines || []).length,
      }));
    }
    default:
      return [{ message: `Report ${reportType} — data placeholder`, ...params }];
  }
}

function writeCsv(filePath, rows) {
  if (!rows.length) {
    fs.writeFileSync(filePath, 'no data\n');
    return;
  }
  const keys = Object.keys(rows[0]);
  const lines = [keys.join(',')];
  for (const row of rows) {
    lines.push(keys.map((k) => JSON.stringify(row[k] ?? '')).join(','));
  }
  fs.writeFileSync(filePath, lines.join('\n'));
}

function writeXlsx(filePath, rows, sheetName = 'Report') {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows.length ? rows : [{ note: 'No data' }]);
  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  xlsx.writeFile(wb, filePath);
}

async function createExport({ req, reportType, format, parameters = {} }) {
  if (!REPORT_TYPES.includes(reportType)) {
    const err = new Error('Invalid report type');
    err.statusCode = 400;
    throw err;
  }
  if (!['pdf', 'xlsx', 'csv'].includes(format)) {
    const err = new Error('Invalid format');
    err.statusCode = 400;
    throw err;
  }

  const rows = await getReportData(req.companyId, reportType, parameters);
  const dir = getDocumentsDir(req.companyId);
  const base = `${reportType}-${Date.now()}`;
  let filePath;

  if (format === 'csv') {
    const abs = path.join(dir, `${base}.csv`);
    writeCsv(abs, rows);
    filePath = relativePath(abs);
  } else if (format === 'xlsx') {
    const abs = path.join(dir, `${base}.xlsx`);
    writeXlsx(abs, rows);
    filePath = relativePath(abs);
  } else {
    const tableRows = rows.map((r) => Object.values(r).map(String));
    const headers = rows[0] ? Object.keys(rows[0]) : ['col'];
    const { relativePath: rel } = await renderAndSavePdf({
      companyId: req.companyId,
      documentType: 'PAYROLL_REGISTER',
      fileName: `${base}.pdf`,
      title: reportType.replace(/_/g, ' ').toUpperCase(),
      sections: {
        blocks: [{ heading: 'Data', table: { headers, rows: tableRows } }],
      },
    });
    filePath = rel;
  }

  const exp = await PayrollExport.create({
    companyId: req.companyId,
    exportType: reportType.toUpperCase(),
    format,
    filePath,
    parameters,
    generatedBy: req.user?.id,
    generatedAt: new Date(),
  });

  return exp;
}

async function listExports(req) {
  return PayrollExport.findAll({
    where: companyWhere(req),
    order: [['id', 'DESC']],
    limit: 100,
  });
}

async function getExport(req, exportId) {
  const row = await PayrollExport.findOne({
    where: { id: exportId, ...companyWhere(req) },
  });
  if (!row) {
    const err = new Error('Export not found');
    err.statusCode = 404;
    throw err;
  }
  return row;
}

module.exports = {
  REPORT_TYPES,
  createExport,
  listExports,
  getExport,
  getReportData,
};
