const { Op } = require('sequelize');
const {
  PayrollRun,
  PayrollRunEmployee,
  PayrollExport,
  Employee,
} = require('../../models');
const { companyWhere } = require('../../utils/companyScope');
const { assertEmployeeInCompany } = require('../../utils/companyScope');
const { renderAndSavePdf } = require('./payrollDocumentRender.service');

const CERT_TYPES = ['SALARY', 'EMPLOYMENT', 'BANK_LETTER', 'VISA_LETTER'];

async function getLatestLockedRunSnapshot(companyId, employeeId) {
  const re = await PayrollRunEmployee.findOne({
    where: { companyId, employeeId },
    include: [
      {
        model: PayrollRun,
        as: 'payrollRun',
        where: { status: 'LOCKED' },
        required: true,
      },
    ],
    order: [['id', 'DESC']],
  });
  if (!re) return null;
  const snap = re.salaryStructureSnapshot || {};
  return {
    grossSalary: Number(re.grossSalary),
    netSalary: Number(re.netSalary),
    deductions: Number(re.deductions),
    salaryStructure: snap,
    runId: re.payrollRunId,
  };
}

async function generateCertificate({ req, employeeId, certificateType = 'SALARY' }) {
  if (!CERT_TYPES.includes(certificateType)) {
    const err = new Error('Invalid certificate type');
    err.statusCode = 400;
    throw err;
  }
  await assertEmployeeInCompany(employeeId, req);
  const employee = await Employee.findOne({
    where: { id: employeeId, ...companyWhere(req) },
    attributes: ['id', 'employeeNo', 'employeeName', 'joiningDate', 'designationId'],
  });
  if (!employee) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }

  const runSnap = await getLatestLockedRunSnapshot(req.companyId, employeeId);
  const snapshot = {
    certificateType,
    employee: {
      id: employee.id,
      employeeNo: employee.employeeNo,
      employeeName: employee.employeeName,
      joiningDate: employee.joiningDate,
    },
    salaryFromLockedRun: runSnap,
    generatedAt: new Date().toISOString(),
  };

  const titles = {
    SALARY: 'Salary Certificate',
    EMPLOYMENT: 'Employment Certificate',
    BANK_LETTER: 'Bank Salary Letter',
    VISA_LETTER: 'Visa Salary Letter',
  };

  const salary = runSnap || { grossSalary: 0, netSalary: 0 };
  const fileName = `CERT-${certificateType}-${employeeId}-${Date.now()}.pdf`;
  const { relativePath: filePath } = await renderAndSavePdf({
    companyId: req.companyId,
    documentType: 'SALARY_CERTIFICATE',
    fileName,
    title: titles[certificateType],
    sections: {
      blocks: [
        {
          heading: 'Employee',
          lines: [
            `Name: ${employee.employeeName}`,
            `No: ${employee.employeeNo}`,
            `Joining: ${employee.joiningDate || '—'}`,
          ],
        },
        {
          heading: 'Compensation (from locked payroll snapshot)',
          lines: [
            `Gross: ${salary.grossSalary ?? 0}`,
            `Net: ${salary.netSalary ?? 0}`,
            runSnap ? `Source run ID: ${runSnap.runId}` : 'No locked payroll run on file',
          ],
        },
      ],
    },
  });

  const exp = await PayrollExport.create({
    companyId: req.companyId,
    exportType: `CERT_${certificateType}`,
    format: 'pdf',
    filePath,
    parameters: snapshot,
    generatedBy: req.user?.id,
    generatedAt: new Date(),
  });

  return { export: exp, snapshot };
}

async function listCertificates(req) {
  return PayrollExport.findAll({
    where: {
      ...companyWhere(req),
      exportType: { [Op.like]: 'CERT_%' },
    },
    order: [['id', 'DESC']],
    limit: 100,
  });
}

module.exports = { CERT_TYPES, generateCertificate, listCertificates, getLatestLockedRunSnapshot };
