const { Op } = require('sequelize');
const {
  EmployeeSalaryStructure,
  EmployeeSalaryLine,
  PayrollComponent,
} = require('../../models');

const DAYS_IN_MONTH = 30;

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function dailySalary(monthly, basisDays = DAYS_IN_MONTH) {
  return round2(Number(monthly || 0) / basisDays);
}

function monthsOfService(joiningDate, lastWorkingDay) {
  if (!joiningDate || !lastWorkingDay) return 0;
  const start = new Date(joiningDate);
  const end = new Date(lastWorkingDay);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  const dayFrac = (end.getDate() - start.getDate()) / 30;
  return Math.max(0, months + dayFrac);
}

function yearsOfService(joiningDate, lastWorkingDay) {
  return monthsOfService(joiningDate, lastWorkingDay) / 12;
}

function getBasicMonthlyAmount(structure) {
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

function getEosMonthlyAmount(structure) {
  if (!structure?.lines) return getBasicMonthlyAmount(structure);
  let total = 0;
  for (const line of structure.lines) {
    if (line.component?.affectsEos) {
      total += Number(line.amount) || 0;
    }
  }
  return total > 0 ? total : getBasicMonthlyAmount(structure);
}

async function getEffectiveSalaryStructure(companyId, employeeId, asOfDate) {
  const structures = await EmployeeSalaryStructure.findAll({
    where: {
      companyId,
      employeeId,
      status: 'active',
      effectiveFrom: { [Op.lte]: asOfDate },
      [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gte]: asOfDate } }],
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

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function proRataSalaryPayable(monthly, lastWorkingDay) {
  const d = new Date(lastWorkingDay);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const totalDays = daysInMonth(year, month);
  const workedDays = d.getDate();
  const daily = dailySalary(monthly);
  return round2(daily * workedDays);
}

module.exports = {
  DAYS_IN_MONTH,
  round2,
  dailySalary,
  monthsOfService,
  yearsOfService,
  getBasicMonthlyAmount,
  getEosMonthlyAmount,
  getEffectiveSalaryStructure,
  proRataSalaryPayable,
};
