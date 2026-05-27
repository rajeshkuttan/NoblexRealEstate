const { Op } = require('sequelize');
const {
  PayrollRun,
  PayrollRunEmployee,
  PayrollWpsConfiguration,
  Employee,
  EmployeeBankDetail,
  EmployeeDocument,
} = require('../../models');
const { validateUaeIban } = require('./payrollIbanValidator');

const APPROVED_STATUSES = new Set(['APPROVED', 'LOCKED']);
const EXPIRY_DOC_TYPES = ['visa', 'passport', 'emirates_id'];
const UAE_NATIONALITIES = new Set(['UAE', 'UNITED ARAB EMIRATES', 'EMIRATI']);

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function isExpired(dateStr) {
  if (!dateStr) return false;
  return dateStr < todayDate();
}

function worstSeverity(a, b) {
  const rank = { ERROR: 3, WARNING: 2, VALID: 1 };
  return (rank[a] || 0) >= (rank[b] || 0) ? a : b;
}

function pushIssue(issues, issue) {
  issues.push(issue);
}

async function getActiveWpsConfig(companyId) {
  return PayrollWpsConfiguration.findOne({
    where: { companyId, status: 'ACTIVE' },
    order: [['id', 'DESC']],
  });
}

async function getPrimaryBank(companyId, employeeId) {
  return EmployeeBankDetail.findOne({
    where: { companyId, employeeId, isPrimary: true },
    order: [['id', 'DESC']],
  });
}

async function getLabourCardFromDocs(companyId, employeeId) {
  const doc = await EmployeeDocument.findOne({
    where: { companyId, employeeId, documentType: 'labour_card' },
    order: [['id', 'DESC']],
  });
  return doc?.documentNumber || null;
}

async function getExpiryIssues(companyId, employeeId, employeeNo) {
  const issues = [];
  const docs = await EmployeeDocument.findAll({
    where: {
      companyId,
      employeeId,
      documentType: { [Op.in]: EXPIRY_DOC_TYPES },
    },
  });
  for (const doc of docs) {
    if (doc.expiryDate && isExpired(doc.expiryDate)) {
      issues.push({
        severity: 'ERROR',
        employeeNo,
        employeeId,
        code: `EXPIRED_${doc.documentType.toUpperCase()}`,
        message: `${doc.documentType.replace(/_/g, ' ')} expired on ${doc.expiryDate}`,
      });
    }
  }
  return issues;
}

function validateEmployeeWpsLine(employee, bank, runEmployee, wpsConfig) {
  const issues = [];
  const employeeNo = employee?.employeeNo;
  const employeeId = employee?.id;
  const wpsEnabled = bank?.wpsEnabled !== false;
  const paymentMethod = bank?.paymentMethod || 'BANK_TRANSFER';
  const netSalary = Number(runEmployee?.netSalary ?? 0);

  if (netSalary <= 0) {
    issues.push({
      severity: 'ERROR',
      code: 'INVALID_SALARY',
      message: 'Net salary must be greater than zero',
      employeeNo,
      employeeId,
    });
  }

  if (wpsEnabled || paymentMethod === 'BANK_TRANSFER') {
    if (!bank?.iban) {
      issues.push({
        severity: 'ERROR',
        code: 'MISSING_IBAN',
        message: 'IBAN is required for WPS bank transfer',
        employeeNo,
        employeeId,
      });
    } else {
      const ibanCheck = validateUaeIban(bank.iban);
      if (!ibanCheck.valid) {
        issues.push({
          severity: 'ERROR',
          code: 'INVALID_IBAN',
          message: ibanCheck.message,
          employeeNo,
          employeeId,
        });
      }
    }
  }

  if (wpsEnabled) {
    const labourCard = bank?.labourCardNo;
    if (!labourCard) {
      issues.push({
        severity: 'ERROR',
        code: 'MISSING_LABOUR_CARD',
        message: 'Labour card number is required for WPS',
        employeeNo,
        employeeId,
      });
    }
  }

  if (!bank?.molPersonalId) {
    issues.push({
      severity: 'ERROR',
      code: 'MISSING_MOL_ID',
      message: 'MOL personal ID is required',
      employeeNo,
      employeeId,
    });
  }

  if (!bank) {
    issues.push({
      severity: 'WARNING',
      code: 'MISSING_PRIMARY_BANK',
      message: 'No primary bank detail on file',
      employeeNo,
      employeeId,
    });
  }

  if (!wpsConfig?.molEstablishmentId) {
    issues.push({
      severity: 'ERROR',
      code: 'MISSING_MOL_ESTABLISHMENT',
      message: 'Active WPS configuration missing MOL establishment ID',
      employeeNo,
      employeeId,
    });
  }

  let status = 'VALID';
  for (const i of issues) {
    status = worstSeverity(status, i.severity === 'ERROR' ? 'ERROR' : i.severity === 'WARNING' ? 'WARNING' : 'VALID');
  }
  if (issues.some((i) => i.severity === 'ERROR')) status = 'ERROR';
  else if (issues.some((i) => i.severity === 'WARNING')) status = 'WARNING';

  return { status, issues };
}

async function validatePayrollCompliance({ companyId, payrollRunId }) {
  const issues = [];
  const run = await PayrollRun.findOne({ where: { id: payrollRunId, companyId } });
  if (!run) {
    pushIssue(issues, {
      severity: 'ERROR',
      code: 'RUN_NOT_FOUND',
      message: 'Payroll run not found',
    });
    return { issues };
  }

  if (!APPROVED_STATUSES.has(run.status)) {
    pushIssue(issues, {
      severity: 'ERROR',
      code: 'RUN_NOT_APPROVED',
      message: `Payroll run must be APPROVED or LOCKED (current: ${run.status})`,
    });
    return { issues };
  }

  const wpsConfig = await getActiveWpsConfig(companyId);
  if (!wpsConfig) {
    pushIssue(issues, {
      severity: 'ERROR',
      code: 'MISSING_WPS_CONFIG',
      message: 'No active WPS configuration for company',
    });
  } else if (!wpsConfig.molEstablishmentId) {
    pushIssue(issues, {
      severity: 'ERROR',
      code: 'MISSING_MOL_ESTABLISHMENT',
      message: 'WPS configuration missing MOL establishment ID',
    });
  }

  const runEmployees = await PayrollRunEmployee.findAll({
    where: { companyId, payrollRunId },
    include: [{ model: Employee, as: 'employee' }],
  });

  const seen = new Set();
  for (const re of runEmployees) {
    const emp = re.employee;
    if (!emp) continue;
    if (emp.status !== 'active') {
      pushIssue(issues, {
        severity: 'ERROR',
        employeeNo: emp.employeeNo,
        employeeId: emp.id,
        code: 'INACTIVE_EMPLOYEE',
        message: 'Inactive employee included in payroll run',
      });
    }
    if (seen.has(emp.id)) {
      pushIssue(issues, {
        severity: 'ERROR',
        employeeNo: emp.employeeNo,
        employeeId: emp.id,
        code: 'DUPLICATE_EMPLOYEE',
        message: 'Duplicate employee in payroll run',
      });
    }
    seen.add(emp.id);

    const bank = await getPrimaryBank(companyId, emp.id);
    const lineResult = validateEmployeeWpsLine(emp, bank, re, wpsConfig);
    for (const li of lineResult.issues) {
      pushIssue(issues, li);
    }

    const expiryIssues = await getExpiryIssues(companyId, emp.id, emp.employeeNo);
    for (const ei of expiryIssues) {
      pushIssue(issues, ei);
    }
  }

  return { issues };
}

function hasBlockingErrors(issues) {
  return issues.some((i) => i.severity === 'ERROR');
}

module.exports = {
  validatePayrollCompliance,
  validateEmployeeWpsLine,
  hasBlockingErrors,
  getPrimaryBank,
  getLabourCardFromDocs,
};
