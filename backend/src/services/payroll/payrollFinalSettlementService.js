const { Op } = require('sequelize');
const {
  Employee,
  EmployeeSeparation,
  PayrollFinalSettlement,
  PayrollFinalSettlementLine,
} = require('../../models');
const { assertSettlementMutable } = require('./payrollFinalSettlementGuard');
const {
  getEffectiveSalaryStructure,
  getBasicMonthlyAmount,
  proRataSalaryPayable,
  round2,
} = require('./payrollSettlementUtils');
const { calculateLeaveEncashment } = require('./payrollLeaveSettlementService');
const { calculateEOS, resolveEosConfiguration } = require('./payrollEOSService');
const { calculateNoticeRecovery } = require('./payrollNoticeRecoveryService');
const { calculateRecoveries } = require('./payrollSettlementRecoveryService');

const EARNING_TYPES = new Set(['EOSB', 'LEAVE_ENCASHMENT', 'SALARY_PAYABLE', 'BONUS']);
const DEDUCTION_TYPES = new Set(['LOAN_RECOVERY', 'NOTICE_RECOVERY', 'DEDUCTION', 'ADJUSTMENT']);

async function assertNoActiveSettlement(companyId, separationId, excludeId) {
  const where = {
    companyId,
    separationId,
    status: { [Op.notIn]: ['CANCELLED'] },
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const existing = await PayrollFinalSettlement.findOne({ where });
  if (existing) {
    const err = new Error('An active final settlement already exists for this separation');
    err.statusCode = 400;
    throw err;
  }
}

async function generateFinalSettlement({ companyId, settlementId, userId }) {
  const settlement = await PayrollFinalSettlement.findOne({
    where: { id: settlementId, companyId },
    include: [
      { model: EmployeeSeparation, as: 'separation' },
      { model: Employee, as: 'employee' },
    ],
  });

  if (!settlement) {
    const err = new Error('Settlement not found');
    err.statusCode = 404;
    throw err;
  }

  assertSettlementMutable(settlement);

  const separation = settlement.separation;
  if (!separation || separation.status !== 'APPROVED') {
    const err = new Error('Separation must be APPROVED before calculating settlement');
    err.statusCode = 400;
    throw err;
  }

  const employee = settlement.employee || (await Employee.findOne({ where: { id: settlement.employeeId, companyId } }));
  if (!employee) {
    const err = new Error('Employee not found');
    err.statusCode = 404;
    throw err;
  }

  const structure = await getEffectiveSalaryStructure(companyId, employee.id, separation.lastWorkingDay);
  if (!structure) {
    const err = new Error('No active salary structure for employee at last working day');
    err.statusCode = 400;
    throw err;
  }

  const eosConfig = await resolveEosConfiguration(companyId, employee.contractType);

  const leaveResult = await calculateLeaveEncashment({
    companyId,
    employeeId: employee.id,
    salaryStructure: structure,
    lastWorkingDay: separation.lastWorkingDay,
  });

  const eosResult = await calculateEOS({
    companyId,
    employee,
    separation,
    salaryStructure: structure,
  });

  const noticeResult = calculateNoticeRecovery({
    separation,
    salaryStructure: structure,
    eosConfig,
  });

  const recoveryResult = await calculateRecoveries({
    companyId,
    employeeId: employee.id,
  });

  const monthlyBasic = getBasicMonthlyAmount(structure);
  const salaryPayable = proRataSalaryPayable(monthlyBasic, separation.lastWorkingDay);

  const lineRows = [];

  if (eosResult.amount > 0) {
    lineRows.push({
      componentType: 'EOSB',
      componentName: 'End of Service Gratuity',
      amount: eosResult.amount,
      calculationSource: eosResult,
    });
  }

  if (leaveResult.amount > 0) {
    lineRows.push({
      componentType: 'LEAVE_ENCASHMENT',
      componentName: 'Leave Encashment',
      amount: leaveResult.amount,
      calculationSource: leaveResult,
    });
  }

  if (salaryPayable > 0) {
    lineRows.push({
      componentType: 'SALARY_PAYABLE',
      componentName: 'Salary Payable (pro-rata)',
      amount: salaryPayable,
      calculationSource: { monthlyBasic, lastWorkingDay: separation.lastWorkingDay },
    });
  }

  if (noticeResult.amount > 0) {
    lineRows.push({
      componentType: 'NOTICE_RECOVERY',
      componentName: 'Notice Period Recovery',
      amount: noticeResult.amount,
      calculationSource: noticeResult,
    });
  }

  for (const item of recoveryResult.items) {
    lineRows.push({
      componentType: item.type === 'ADJUSTMENT' ? 'ADJUSTMENT' : 'LOAN_RECOVERY',
      componentName: item.name,
      amount: item.amount,
      calculationSource: item,
    });
  }

  let gross = 0;
  let deductions = 0;
  for (const line of lineRows) {
    if (EARNING_TYPES.has(line.componentType)) gross += line.amount;
    if (DEDUCTION_TYPES.has(line.componentType)) deductions += line.amount;
  }

  gross = round2(gross);
  deductions = round2(deductions);
  const net = round2(gross - deductions);

  const snapshot = {
    employee_id: employee.id,
    separation_id: separation.id,
    leave: leaveResult,
    eos: eosResult,
    notice: noticeResult,
    recoveries: recoveryResult,
    salary_payable: salaryPayable,
    calculated_at: new Date().toISOString(),
  };

  await PayrollFinalSettlementLine.destroy({ where: { settlementId: settlement.id, companyId } });

  for (const line of lineRows) {
    await PayrollFinalSettlementLine.create({
      companyId,
      settlementId: settlement.id,
      componentType: line.componentType,
      componentName: line.componentName,
      amount: line.amount,
      calculationSource: line.calculationSource,
    });
  }

  await settlement.update({
    grossSettlement: gross,
    deductions,
    netSettlement: net,
    calculationSnapshot: snapshot,
    status: 'CALCULATED',
  });

  return { settlement, lines: lineRows, snapshot, leaveResult, eosResult };
}

async function getSettlementWithLines(companyId, settlementId) {
  return PayrollFinalSettlement.findOne({
    where: { id: settlementId, companyId },
    include: [
      { model: PayrollFinalSettlementLine, as: 'lines' },
      { model: EmployeeSeparation, as: 'separation' },
      { model: Employee, as: 'employee' },
    ],
  });
}

async function approveSettlement(companyId, settlementId, userId) {
  const settlement = await getSettlementWithLines(companyId, settlementId);
  if (!settlement) {
    const err = new Error('Settlement not found');
    err.statusCode = 404;
    throw err;
  }
  assertSettlementMutable(settlement);
  if (!['CALCULATED', 'UNDER_REVIEW'].includes(settlement.status)) {
    const err = new Error('Settlement must be CALCULATED or UNDER_REVIEW to approve');
    err.statusCode = 400;
    throw err;
  }
  await settlement.update({ status: 'APPROVED', approvedBy: userId });
  return settlement;
}

async function lockSettlement(companyId, settlementId) {
  const settlement = await getSettlementWithLines(companyId, settlementId);
  if (!settlement) {
    const err = new Error('Settlement not found');
    err.statusCode = 404;
    throw err;
  }
  if (settlement.status !== 'APPROVED') {
    const err = new Error('Settlement must be APPROVED before lock');
    err.statusCode = 400;
    throw err;
  }
  await settlement.update({ status: 'LOCKED' });
  return settlement;
}

async function cancelSettlement(companyId, settlementId) {
  const settlement = await PayrollFinalSettlement.findOne({ where: { id: settlementId, companyId } });
  if (!settlement) {
    const err = new Error('Settlement not found');
    err.statusCode = 404;
    throw err;
  }
  assertSettlementMutable(settlement);
  await settlement.update({ status: 'CANCELLED' });
  return settlement;
}

module.exports = {
  generateFinalSettlement,
  getSettlementWithLines,
  approveSettlement,
  lockSettlement,
  cancelSettlement,
  assertNoActiveSettlement,
};
