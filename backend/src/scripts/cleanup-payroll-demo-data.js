#!/usr/bin/env node
/**
 * Removes DEMO-CRE-* payroll demo data for the resolved company. Requires --confirm.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { Op } = require('sequelize');
const { sequelize } = require('../models');
const { buildContext } = require('./payroll-full-cycle/context');
const { DEMO_PREFIX } = require('./payroll-full-cycle/constants');

const models = require('../models');

async function destroyWhere(Model, where) {
  const n = await Model.destroy({ where });
  if (n > 0) console.log(`  ${Model.name}: ${n}`);
  return n;
}

async function cleanupDemoData(ctx) {
  const { companyId } = ctx;
  const demoEmployees = await models.Employee.findAll({
    where: { companyId, employeeNo: { [Op.like]: `${DEMO_PREFIX}%` } },
    attributes: ['id'],
  });
  const empIds = demoEmployees.map((e) => e.id);
  if (!empIds.length) {
    console.log('No demo employees found.');
    return;
  }

  const runIds = (
    await models.PayrollRun.findAll({
      where: { companyId },
      attributes: ['id'],
    })
  ).map((r) => r.id);

  await destroyWhere(models.PayrollPayslip, { companyId, payrollRunEmployeeId: { [Op.ne]: null } });
  await destroyWhere(models.PayrollExport, { companyId });
  await destroyWhere(models.PayrollWpsEmployeeLine, { companyId });
  await destroyWhere(models.PayrollWpsBatch, { companyId });
  await destroyWhere(models.PayrollRunComponentLine, { companyId });
  await destroyWhere(models.PayrollRunEmployee, { companyId });
  await destroyWhere(models.PayrollRun, { companyId });
  await destroyWhere(models.PayrollFinalSettlementLine, { companyId });
  await destroyWhere(models.PayrollFinalSettlement, { companyId });
  await destroyWhere(models.EmployeeSeparation, { companyId, employeeId: { [Op.in]: empIds } });
  await destroyWhere(models.PayrollAttendanceDailySummary, { companyId, employeeId: { [Op.in]: empIds } });
  await destroyWhere(models.PayrollLeaveApplication, { companyId, employeeId: { [Op.in]: empIds } });
  await destroyWhere(models.PayrollLeaveOpeningBalance, { companyId, employeeId: { [Op.in]: empIds } });
  await destroyWhere(models.PayrollOvertimeRequest, { companyId, employeeId: { [Op.in]: empIds } });
  await destroyWhere(models.PayrollLabourTimesheetLine, { companyId, employeeId: { [Op.in]: empIds } });
  await destroyWhere(models.PayrollLabourTimesheet, { companyId });
  await destroyWhere(models.PayrollMonthlyAdjustment, { companyId, employeeId: { [Op.in]: empIds } });
  await destroyWhere(models.EmployeeLoanInstallment, { companyId });
  await destroyWhere(models.EmployeeLoan, { companyId, employeeId: { [Op.in]: empIds } });
  await destroyWhere(models.EmployeeSalaryLine, { companyId });
  await destroyWhere(models.EmployeeSalaryStructure, { companyId, employeeId: { [Op.in]: empIds } });
  await destroyWhere(models.EmployeeBankDetail, { companyId, employeeId: { [Op.in]: empIds } });
  await destroyWhere(models.EmployeeDocument, { companyId, employeeId: { [Op.in]: empIds } });
  await destroyWhere(models.Employee, { companyId, id: { [Op.in]: empIds } });

  const codeLike = { [Op.like]: `${DEMO_PREFIX}%` };
  await destroyWhere(models.Department, { companyId, departmentCode: codeLike });
  await destroyWhere(models.Designation, { companyId, designationCode: codeLike });
  await destroyWhere(models.WorkforceGroup, { companyId, groupCode: codeLike });
  await destroyWhere(models.PayrollGroup, { companyId, groupCode: codeLike });
  await destroyWhere(models.CostCenter, { companyId, costCenterCode: codeLike });
  await destroyWhere(models.WorkLocation, { companyId, locationCode: codeLike });
  await destroyWhere(models.PayrollBranch, { companyId, branchCode: codeLike });
  await destroyWhere(models.ShiftMaster, { companyId, shiftCode: codeLike });
  await destroyWhere(models.HolidayCalendar, { companyId, calendarCode: codeLike });
  await destroyWhere(models.WorkCalendar, { companyId, calendarCode: codeLike });
  await destroyWhere(models.LeaveType, { companyId, leaveCode: codeLike });
  await destroyWhere(models.LeavePolicy, { companyId, policyCode: codeLike });
  await destroyWhere(models.ChartOfAccount, { companyId, accountCode: codeLike });
}

async function main() {
  if (!process.argv.includes('--confirm')) {
    console.error('Refusing to delete without --confirm');
    process.exit(1);
  }
  try {
    await sequelize.authenticate();
    const ctx = await buildContext();
    console.log(`Cleaning demo data for company ${ctx.companyId}...\n`);
    await cleanupDemoData(ctx);
    console.log('\nCleanup done.');
    process.exit(0);
  } catch (e) {
    console.error('Cleanup failed:', e.message);
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
    } catch (_) {
      /* ignore */
    }
  }
}

main();
