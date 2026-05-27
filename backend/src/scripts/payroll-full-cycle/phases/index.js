const { Op } = require('sequelize');
const {
  CompanySetting,
  CompanyFinancialYear,
  CompanyFinancialPeriod,
  CompanyDocumentTemplate,
  ChartOfAccount,
  PayrollAccountConfiguration,
  VisaSponsorCompany,
  PayrollBranch,
  CostCenter,
  Department,
  EmployeeGrade,
  EmployeeLevel,
  EmploymentCategory,
  Designation,
  WorkforceGroup,
  PayrollGroup,
  WorkLocation,
  ShiftMaster,
  HolidayCalendar,
  HolidayCalendarDate,
  WorkCalendar,
  LeaveType,
  LeavePolicy,
  LeavePolicyRule,
  LeavePolicyAssignment,
  PayrollComponent,
  Employee,
  EmployeeDocument,
  EmployeeBankDetail,
  EmployeeSalaryStructure,
  EmployeeSalaryLine,
  PayrollLeaveOpeningBalance,
  PayrollLeaveApplication,
  PayrollOvertimeRequest,
  PayrollLabourTimesheet,
  PayrollLabourTimesheetLine,
  PayrollAttendancePeriod,
  PayrollAttendanceDailySummary,
  PayrollMonthlyAdjustment,
  EmployeeLoan,
  EmployeeLoanInstallment,
  PayrollPeriod,
  PayrollRun,
  PayrollRunEmployee,
  PayrollWpsConfiguration,
  PayrollWpsBatch,
  EmployeeSeparation,
  PayrollFinalSettlement,
  PayrollEosConfiguration,
  PayrollEosRuleTier,
} = require('../../../models');
const { findOrCreate } = require('../idempotent');
const {
  DEMO_PREFIX,
  PERIOD_MONTH,
  PERIOD_YEAR,
  PERIOD_FROM,
  PERIOD_TO,
  demoIban,
} = require('../constants');
const { generateStaffAttendance } = require('../../../services/payroll/payrollStaffAttendanceService');
const { lockSummariesForPeriod } = require('../../../services/payroll/payrollDailySummaryService');
const { applyLabourLine } = require('../../../services/payroll/payrollDailySummaryService');
const { generatePayrollPeriod } = require('../../../services/payroll/payrollPeriodService');
const { generatePayroll } = require('../../../services/payroll/payrollCalculationService');
const {
  generateWpsBatch,
  reviewBatch,
  approveBatch,
  exportBatch,
} = require('../../../services/payroll/payrollWpsBatchService');
const {
  generateFinalSettlement,
  approveSettlement,
  lockSettlement,
} = require('../../../services/payroll/payrollFinalSettlementService');
const {
  postPayrollRun,
  postSettlement,
} = require('../../../services/payroll/payrollFinancePosting.service');
const {
  generateBatchPayslips,
  publishPayslips,
} = require('../../../services/payroll/payrollPayslip.service');
const { generateCertificate } = require('../../../services/payroll/payrollSalaryCertificate.service');
const { generateSettlementStatement } = require('../../../services/payroll/payrollSettlementStatement.service');
const { generateLedgerStatement } = require('../../../services/payroll/employeeLedgerStatement.service');
const { createExport } = require('../../../services/payroll/payrollExport.service');

function code(suffix) {
  return `${DEMO_PREFIX}${suffix}`;
}

function empNo(n) {
  return `${DEMO_PREFIX}${String(n).padStart(3, '0')}`;
}

async function phase0Prerequisites(ctx) {
  const { companyId, company, userId } = ctx;
  const patch = {};
  if (!company.taxNumber) patch.taxNumber = '100123456700003';
  if (!company.address) patch.address = 'Business Bay, Dubai, UAE';
  if (!company.currency) patch.currency = 'AED';
  if (!company.timezone) patch.timezone = 'Asia/Dubai';
  if (Object.keys(patch).length) await company.update(patch);

  let fy = await CompanyFinancialYear.findOne({
    where: { companyId, startDate: { [Op.lte]: PERIOD_FROM }, endDate: { [Op.gte]: PERIOD_TO } },
  });
  if (!fy) {
    fy = await CompanyFinancialYear.create({
      companyId,
      yearName: 'FY 2025-2026',
      startDate: '2025-07-01',
      endDate: '2026-06-30',
      isCurrent: true,
    });
  }
  const fyPeriods = [
    { periodNo: 1, startDate: '2025-07-01', endDate: '2025-07-31' },
    { periodNo: 2, startDate: '2025-08-01', endDate: '2025-08-31' },
    { periodNo: 3, startDate: '2025-09-01', endDate: '2025-09-30' },
    { periodNo: 4, startDate: '2025-10-01', endDate: '2025-10-31' },
    { periodNo: 5, startDate: '2025-11-01', endDate: '2025-11-30' },
    { periodNo: 6, startDate: '2025-12-01', endDate: '2025-12-31' },
    { periodNo: 7, startDate: '2026-01-01', endDate: '2026-01-31' },
    { periodNo: 8, startDate: '2026-02-01', endDate: '2026-02-28' },
    { periodNo: 9, startDate: '2026-03-01', endDate: '2026-03-31' },
    { periodNo: 10, startDate: '2026-04-01', endDate: '2026-04-30' },
    { periodNo: 11, startDate: '2026-05-01', endDate: '2026-05-31' },
    { periodNo: 12, startDate: '2026-06-01', endDate: '2026-06-30' },
  ];
  for (const p of fyPeriods) {
    await findOrCreate(
      CompanyFinancialPeriod,
      { companyId, financialYearId: fy.id, periodNo: p.periodNo },
      { startDate: p.startDate, endDate: p.endDate, status: 'OPEN' }
    );
  }

  for (const docType of ['PAYSLIP', 'PAYROLL_REGISTER', 'SETTLEMENT', 'SALARY_CERTIFICATE', 'WPS_EXPORT']) {
    await findOrCreate(
      CompanyDocumentTemplate,
      { companyId, documentType: docType },
      { showTrn: true, showBank: true, showCompanyAddress: true }
    );
  }

  const accountDefs = [
    { accountCode: code('EXP-BASIC'), accountName: 'Demo Payroll Basic Expense', accountType: 'expense' },
    { accountCode: code('EXP-ALLOW'), accountName: 'Demo Payroll Allowance Expense', accountType: 'expense' },
    { accountCode: code('PAYABLE'), accountName: 'Demo Payroll Payable', accountType: 'liability' },
    { accountCode: code('LOAN-REC'), accountName: 'Demo Loan Recovery', accountType: 'asset' },
    { accountCode: code('EOS-EXP'), accountName: 'Demo EOS Expense', accountType: 'expense' },
    { accountCode: code('LEAVE-ENC'), accountName: 'Demo Leave Encashment', accountType: 'expense' },
    { accountCode: code('SETTLE-PAY'), accountName: 'Demo Settlement Payable', accountType: 'liability' },
  ];
  const accounts = {};
  for (const def of accountDefs) {
    const { record } = await findOrCreate(
      ChartOfAccount,
      { companyId, accountCode: def.accountCode },
      { accountName: def.accountName, accountType: def.accountType, level: 1, isActive: true }
    );
    accounts[def.accountCode] = record.id;
  }

  const { record: config } = await findOrCreate(
    PayrollAccountConfiguration,
    { companyId },
    {
      basicSalaryExpenseAccount: accounts[code('EXP-BASIC')],
      housingExpenseAccount: accounts[code('EXP-ALLOW')],
      transportExpenseAccount: accounts[code('EXP-ALLOW')],
      allowanceExpenseAccount: accounts[code('EXP-ALLOW')],
      overtimeExpenseAccount: accounts[code('EXP-BASIC')],
      payrollPayableAccount: accounts[code('PAYABLE')],
      loanRecoveryAccount: accounts[code('LOAN-REC')],
      eosExpenseAccount: accounts[code('EOS-EXP')],
      leaveEncashmentAccount: accounts[code('LEAVE-ENC')],
      settlementPayableAccount: accounts[code('SETTLE-PAY')],
      active: true,
    }
  );
  if (!config.basicSalaryExpenseAccount) {
    await config.update({
      basicSalaryExpenseAccount: accounts[code('EXP-BASIC')],
      payrollPayableAccount: accounts[code('PAYABLE')],
      active: true,
    });
  }
  ctx.handles.accounts = accounts;
  ctx.handles.payrollAccountConfig = config;
}

async function phase1Masters(ctx) {
  const { companyId } = ctx;
  const { record: sponsor } = await findOrCreate(
    VisaSponsorCompany,
    { companyId, sponsorName: 'Demo CRE Sponsor' },
    { molNumber: code('MOL-SP'), isActive: true }
  );
  const { record: branch } = await findOrCreate(
    PayrollBranch,
    { companyId, branchCode: code('HQ') },
    { branchName: 'Demo CRE HQ', status: 'active' }
  );
  const { record: cc } = await findOrCreate(
    CostCenter,
    { companyId, costCenterCode: code('CC-MAIN') },
    { costCenterName: 'Demo Main Cost Center', status: 'active' }
  );

  const deptNames = [
    'Property Management',
    'Leasing',
    'Maintenance',
    'Finance',
    'Administration',
  ];
  const departments = {};
  for (let i = 0; i < deptNames.length; i += 1) {
    const key = `DEPT-${i + 1}`;
    const { record } = await findOrCreate(
      Department,
      { companyId, departmentCode: code(key) },
      { departmentName: deptNames[i], costCenterId: cc.id, status: 'active' }
    );
    departments[key] = record;
  }

  const { record: grade } = await findOrCreate(
    EmployeeGrade,
    { companyId, gradeCode: code('G1') },
    { gradeName: 'Grade 1', status: 'active' }
  );
  const { record: level } = await findOrCreate(
    EmployeeLevel,
    { companyId, levelCode: code('L1') },
    { levelName: 'Level 1', status: 'active' }
  );
  const { record: category } = await findOrCreate(
    EmploymentCategory,
    { companyId, categoryCode: code('CAT-FT') },
    { categoryName: 'Full Time', status: 'active' }
  );

  const wfDefs = [
    ['STAFF', 'Staff'],
    ['LABOUR', 'Labour'],
    ['MANAGEMENT', 'Management'],
    ['TECHNICAL', 'Technical'],
  ];
  const workforce = {};
  for (const [c, n] of wfDefs) {
    const { record } = await findOrCreate(
      WorkforceGroup,
      { companyId, groupCode: code(c) },
      { groupName: n, status: 'active' }
    );
    workforce[c] = record;
  }

  const { record: payrollGroup } = await findOrCreate(
    PayrollGroup,
    { companyId, groupCode: code('PG-MONTHLY') },
    { groupName: 'Monthly Payroll', status: 'active' }
  );
  const { record: workLoc } = await findOrCreate(
    WorkLocation,
    { companyId, locationCode: code('LOC-DXB') },
    { locationName: 'Dubai Office', status: 'active' }
  );

  for (const sh of ['MORNING', 'EVENING', 'NIGHT']) {
    await findOrCreate(
      ShiftMaster,
      { companyId, shiftCode: code(sh) },
      { shiftName: sh, startTime: '08:00', endTime: '17:00', status: 'active' }
    );
  }

  const { record: holCal } = await findOrCreate(
    HolidayCalendar,
    { companyId, calendarCode: code('HOL-2026') },
    { calendarName: 'UAE 2026', year: 2026, status: 'active' }
  );
  await findOrCreate(
    HolidayCalendarDate,
    { companyId, holidayCalendarId: holCal.id, holidayDate: '2026-06-05' },
    { description: 'Demo Eid Holiday' }
  );

  const { record: workCal } = await findOrCreate(
    WorkCalendar,
    { companyId, calendarCode: code('WC-STD') },
    { calendarName: 'Standard Mon-Fri', workDays: 'mon,tue,wed,thu,fri', status: 'active' }
  );

  const leaveDefs = [
    ['ANNUAL', 'Annual Leave', true],
    ['SICK', 'Sick Leave', true],
    ['UNPAID', 'Unpaid Leave', false],
    ['MATERNITY', 'Maternity Leave', true],
  ];
  const leaveTypes = {};
  for (const [c, name, paid] of leaveDefs) {
    const { record } = await findOrCreate(
      LeaveType,
      { companyId, leaveCode: code(c) },
      { leaveName: name, isPaid: paid, status: 'active' }
    );
    leaveTypes[c] = record;
    const { record: policy } = await findOrCreate(
      LeavePolicy,
      { companyId, policyCode: code(`POL-${c}`) },
      { policyName: `${name} Policy`, leaveTypeId: record.id, status: 'active' }
    );
    await findOrCreate(
      LeavePolicyRule,
      { companyId, leavePolicyId: policy.id },
      { annualEntitlementDays: paid ? 30 : 0, encashmentEnabled: paid }
    );
    ctx.handles[`policy_${c}`] = policy;
  }

  const compDefs = [
    ['BASIC', 'Basic Salary', 'EARNING', 'PRORATE'],
    ['HOUSING', 'Housing Allowance', 'EARNING', 'PRORATE'],
    ['TRANSPORT', 'Transport', 'EARNING', 'PRORATE'],
    ['OVERTIME', 'Overtime', 'EARNING', 'OVERTIME'],
    ['LOAN', 'Loan Deduction', 'DEDUCTION', 'FIXED'],
    ['BONUS', 'Bonus', 'EARNING', 'FIXED'],
    ['PENALTY', 'Penalty', 'DEDUCTION', 'FIXED'],
  ];
  const components = {};
  for (const [c, name, type, method] of compDefs) {
    const { record } = await findOrCreate(
      PayrollComponent,
      { companyId, componentCode: c },
      {
        componentName: name,
        componentType: type,
        calculationMethod: method,
        taxable: false,
        recurring: true,
        affectsWps: type === 'EARNING',
        status: 'active',
      }
    );
    components[c] = record;
  }

  const { record: designation } = await findOrCreate(
    Designation,
    { companyId, designationCode: code('DESIG-MGR') },
    {
      designationName: 'Demo Manager',
      gradeId: grade.id,
      levelId: level.id,
      employmentCategoryId: category.id,
      status: 'active',
    }
  );

  ctx.handles = {
    ...ctx.handles,
    sponsor,
    branch,
    cc,
    departments,
    grade,
    level,
    category,
    workforce,
    payrollGroup,
    workLoc,
    workCal,
    leaveTypes,
    components,
    designation,
  };
}

async function createEmployee(ctx, spec) {
  const { companyId, userId } = ctx;
  const h = ctx.handles;
  const empDefaults = {
    employeeName: spec.name,
    branchId: h.branch.id,
    departmentId: h.departments[spec.deptKey || 'DEPT-1'].id,
    designationId: h.designation.id,
    gradeId: h.grade.id,
    workforceGroupId: h.workforce[spec.workforce].id,
    payrollGroupId: h.payrollGroup.id,
    visaSponsorCompanyId: h.sponsor.id,
    workLocationId: h.workLoc.id,
    nationality: spec.nationality || 'India',
    joiningDate: spec.joiningDate || '2022-01-01',
    status: 'active',
    uaeNational: !!spec.uaeNational,
    gpssaEligible: !!spec.gpssaEligible,
    contractType: spec.contractType || 'LIMITED',
    createdBy: userId,
  };
  const { record: emp, created } = await findOrCreate(
    Employee,
    { companyId, employeeNo: spec.no },
    empDefaults
  );
  if (!created) await emp.update(empDefaults);

  for (const docType of ['passport', 'visa', 'emirates_id', 'labour_card']) {
    await findOrCreate(
      EmployeeDocument,
      { companyId, employeeId: emp.id, documentType: docType },
      {
        documentNumber: `${spec.no}-${docType}`.slice(0, 50),
        expiryDate: docType === 'visa' ? '2026-07-15' : '2028-12-31',
      }
    );
  }

  if (spec.bank !== false) {
    await findOrCreate(
      EmployeeBankDetail,
      { companyId, employeeId: emp.id, isPrimary: true },
      {
        bankName: 'Emirates NBD',
        iban: spec.iban || demoIban(spec.ibanSuffix || '0'),
        molPersonalId: spec.molId || `MOL-${spec.no}`,
        labourCardNo: spec.labourCard || `LC-${spec.no}`,
        wpsEnabled: spec.wpsEnabled !== false,
        paymentMethod: spec.paymentMethod || 'BANK_TRANSFER',
        isPrimary: true,
      }
    );
  }

  const comps = h.components;
  const basic = spec.basic || 8000;
  const housing = spec.housing || 3000;
  const { record: structure } = await findOrCreate(
    EmployeeSalaryStructure,
    { companyId, employeeId: emp.id, effectiveFrom: '2022-01-01' },
    { currency: 'AED', status: 'active' }
  );
  const lines = [
    [comps.BASIC, basic],
    [comps.HOUSING, housing],
    [comps.TRANSPORT, 500],
  ];
  for (const [comp, amount] of lines) {
    await findOrCreate(
      EmployeeSalaryLine,
      { companyId, salaryStructureId: structure.id, payrollComponentId: comp.id },
      { amount, lineDescription: comp.componentName }
    );
  }

  ctx.handles.employees = ctx.handles.employees || {};
  ctx.handles.employees[spec.key] = emp;
  return emp;
}

async function phase2Employees(ctx) {
  const specs = [
    { key: 'e01', no: empNo(1), name: 'Demo Staff One', workforce: 'STAFF', ibanSuffix: '1' },
    { key: 'e02', no: empNo(2), name: 'Demo Manager', workforce: 'MANAGEMENT', basic: 15000, housing: 5000, ibanSuffix: '2' },
    { key: 'e03', no: empNo(3), name: 'Demo OT Staff', workforce: 'STAFF', ibanSuffix: '3' },
    { key: 'e04', no: empNo(4), name: 'Demo Loan Staff', workforce: 'STAFF', ibanSuffix: '4' },
    {
      key: 'e05',
      no: empNo(5),
      name: 'Demo UAE National',
      workforce: 'STAFF',
      uaeNational: true,
      gpssaEligible: true,
      nationality: 'UAE',
      ibanSuffix: '5',
    },
    { key: 'e06', no: empNo(6), name: 'Demo Leave Staff', workforce: 'STAFF', ibanSuffix: '6' },
    { key: 'e07', no: empNo(7), name: 'Demo Unpaid Leave', workforce: 'STAFF', ibanSuffix: '7' },
    { key: 'e08', no: empNo(8), name: 'Demo Bonus Staff', workforce: 'STAFF', ibanSuffix: '8' },
    { key: 'e09', no: empNo(9), name: 'Demo Labour One', workforce: 'LABOUR', ibanSuffix: '9' },
    { key: 'e10', no: empNo(10), name: 'Demo Staff Ten', workforce: 'STAFF', ibanSuffix: '0' },
    {
      key: 'e11',
      no: empNo(11),
      name: 'Demo Salary Card',
      workforce: 'STAFF',
      paymentMethod: 'SALARY_CARD',
      wpsEnabled: false,
      iban: null,
      molId: `MOL-${empNo(11)}`,
    },
    {
      key: 'sep',
      no: `${DEMO_PREFIX}SEP`,
      name: 'Demo Separation Employee',
      workforce: 'STAFF',
      joiningDate: '2018-05-01',
      ibanSuffix: '6',
    },
  ];
  for (const spec of specs) await createEmployee(ctx, spec);
}

async function phase3Attendance(ctx, req) {
  const { companyId, userId } = ctx;
  const lt = ctx.handles.leaveTypes;
  const emps = ctx.handles.employees;

  let attPeriod = await PayrollAttendancePeriod.findOne({
    where: { companyId, periodMonth: PERIOD_MONTH, periodYear: PERIOD_YEAR },
  });
  if (attPeriod?.status === 'LOCKED') {
    const demoIds = Object.values(emps).map((e) => e.id);
    await PayrollAttendanceDailySummary.update(
      { locked: false },
      {
        where: {
          companyId,
          employeeId: { [Op.in]: demoIds },
          attendanceDate: { [Op.between]: [PERIOD_FROM, PERIOD_TO] },
        },
      }
    );
    await generateStaffAttendance(companyId, PERIOD_FROM, PERIOD_TO, demoIds);
    await lockSummariesForPeriod(companyId, PERIOD_FROM, PERIOD_TO);
    ctx.handles.attendancePeriodId = attPeriod.id;
    return;
  }

  for (const emp of Object.values(emps)) {
    for (const [ltKey, days] of [
      ['ANNUAL', 30],
      ['SICK', 15],
    ]) {
      await findOrCreate(
        PayrollLeaveOpeningBalance,
        { companyId, employeeId: emp.id, leaveTypeId: lt[ltKey].id, balanceYear: PERIOD_YEAR },
        {
          openingDays: days,
          usedDays: 0,
          adjustedDays: 0,
          availableDays: days,
          status: 'APPROVED',
          approvedBy: userId,
        }
      );
    }
  }

  await PayrollLeaveApplication.create({
    companyId,
    employeeId: emps.e06.id,
    leaveTypeId: lt.ANNUAL.id,
    fromDate: '2026-06-10',
    toDate: '2026-06-12',
    totalDays: 3,
    status: 'APPROVED',
    approvedBy: userId,
    approvedAt: new Date(),
  }).catch(() => {});

  await findOrCreate(
    PayrollLeaveApplication,
    { companyId, employeeId: emps.e07.id, fromDate: '2026-06-17', toDate: '2026-06-18' },
    {
      leaveTypeId: lt.UNPAID.id,
      totalDays: 2,
      status: 'APPROVED',
      approvedBy: userId,
      approvedAt: new Date(),
    }
  );

  await PayrollLeaveApplication.create({
    companyId,
    employeeId: emps.e01.id,
    leaveTypeId: lt.SICK.id,
    fromDate: '2026-06-20',
    toDate: '2026-06-20',
    totalDays: 1,
    status: 'REJECTED',
    rejectedBy: userId,
    rejectedAt: new Date(),
    rejectionReason: 'Demo rejected',
  }).catch(() => {});

  await generateStaffAttendance(companyId, PERIOD_FROM, PERIOD_TO);

  const otReq = await PayrollOvertimeRequest.create({
    companyId,
    employeeId: emps.e03.id,
    workDate: '2026-06-15',
    requestedHours: 4,
    approvedHours: 4,
    status: 'APPROVED',
    approvedBy: userId,
    approvedAt: new Date(),
  });
  const { applyOvertimeApproval } = require('../../../services/payroll/payrollDailySummaryService');
  await applyOvertimeApproval(companyId, otReq);

  const labourKeys = ['e09'];
  const labourByDept = {};
  for (const key of labourKeys) {
    const emp = emps[key];
    if (!labourByDept[emp.departmentId]) labourByDept[emp.departmentId] = [];
    labourByDept[emp.departmentId].push(emp);
  }
  const workDates = [];
  for (let d = 1; d <= 30; d += 1) {
    const ds = `2026-06-${String(d).padStart(2, '0')}`;
    const dow = new Date(ds).getUTCDay();
    if (dow >= 1 && dow <= 5) workDates.push(ds);
  }
  for (const [departmentId, deptEmps] of Object.entries(labourByDept)) {
    let ts = await PayrollLabourTimesheet.findOne({
      where: {
        companyId,
        timesheetMonth: PERIOD_MONTH,
        timesheetYear: PERIOD_YEAR,
        departmentId: Number(departmentId),
      },
    });
    if (!ts) {
      ts = await PayrollLabourTimesheet.create({
        companyId,
        timesheetMonth: PERIOD_MONTH,
        timesheetYear: PERIOD_YEAR,
        departmentId: Number(departmentId),
        status: 'DRAFT',
        createdBy: userId,
      });
    }
    for (const emp of deptEmps) {
      for (const workDate of workDates) {
        await findOrCreate(
          PayrollLabourTimesheetLine,
          { companyId, timesheetId: ts.id, employeeId: emp.id, workDate },
          { normalHours: 8, overtimeHours: workDate === '2026-06-08' ? 2 : 0 }
        );
      }
    }
    if (ts.status === 'DRAFT') await ts.update({ status: 'SUBMITTED' });
    if (ts.status === 'SUBMITTED') {
      const lines = await PayrollLabourTimesheetLine.findAll({
        where: { companyId, timesheetId: ts.id },
      });
      for (const line of lines) await applyLabourLine(companyId, line);
      await ts.update({ status: 'APPROVED', approvedBy: userId, approvedAt: new Date() });
    }
  }

  if (!attPeriod) {
    attPeriod = await PayrollAttendancePeriod.create({
      companyId,
      periodMonth: PERIOD_MONTH,
      periodYear: PERIOD_YEAR,
      fromDate: PERIOD_FROM,
      toDate: PERIOD_TO,
      status: 'GENERATED',
      generatedBy: userId,
      generatedAt: new Date(),
    });
  }
  if (attPeriod.status !== 'LOCKED') {
    if (!['APPROVED', 'UNDER_REVIEW'].includes(attPeriod.status)) {
      await attPeriod.update({ status: 'APPROVED', approvedBy: userId, approvedAt: new Date() });
    }
    await lockSummariesForPeriod(companyId, attPeriod.fromDate, attPeriod.toDate);
    await attPeriod.update({ status: 'LOCKED', lockedBy: userId, lockedAt: new Date() });
  }
  ctx.handles.attendancePeriodId = attPeriod.id;
}

async function phase4Adjustments(ctx) {
  const { companyId, userId } = ctx;
  const emps = ctx.handles.employees;
  const comps = ctx.handles.components;

  let period = await PayrollPeriod.findOne({
    where: { companyId, periodMonth: PERIOD_MONTH, periodYear: PERIOD_YEAR },
  });
  if (!period) {
    period = await generatePayrollPeriod(companyId, PERIOD_MONTH, PERIOD_YEAR, userId);
  }
  ctx.handles.payrollPeriodId = period.id;

  await findOrCreate(
    PayrollMonthlyAdjustment,
    { companyId, employeeId: emps.e08.id, payrollPeriodId: period.id, adjustmentType: 'ADDITION' },
    {
      componentId: comps.BONUS.id,
      amount: 1500,
      reason: 'Demo performance bonus',
      status: 'APPROVED',
      approvedBy: userId,
      approvedAt: new Date(),
    }
  );
  await findOrCreate(
    PayrollMonthlyAdjustment,
    { companyId, employeeId: emps.e01.id, payrollPeriodId: period.id, adjustmentType: 'DEDUCTION' },
    {
      componentId: comps.PENALTY.id,
      amount: 200,
      reason: 'Demo penalty',
      status: 'APPROVED',
      approvedBy: userId,
      approvedAt: new Date(),
    }
  );
  await findOrCreate(
    PayrollMonthlyAdjustment,
    { companyId, employeeId: emps.e01.id, payrollPeriodId: period.id, adjustmentType: 'ADDITION' },
    {
      componentId: comps.BONUS.id,
      amount: 300,
      reason: 'Demo manual allowance',
      status: 'APPROVED',
      approvedBy: userId,
      approvedAt: new Date(),
    }
  );

  const { record: loan } = await findOrCreate(
    EmployeeLoan,
    { companyId, employeeId: emps.e04.id, status: 'ACTIVE' },
    {
      loanAmount: 12000,
      monthlyInstallment: 1000,
      balance: 11000,
      startPeriodMonth: PERIOD_MONTH,
      startPeriodYear: PERIOD_YEAR,
      createdBy: userId,
    }
  );
  await findOrCreate(
    EmployeeLoanInstallment,
    { companyId, loanId: loan.id, duePeriodMonth: PERIOD_MONTH, duePeriodYear: PERIOD_YEAR },
    { installmentAmount: 1000, status: 'APPROVED', approvedBy: userId, approvedAt: new Date() }
  );
}

async function phase5PayrollRun(ctx) {
  const { companyId, userId } = ctx;
  const period = await PayrollPeriod.findOne({
    where: { companyId, periodMonth: PERIOD_MONTH, periodYear: PERIOD_YEAR },
  });
  if (!period) throw new Error('Payroll period missing after phase 4');

  let run = await PayrollRun.findOne({
    where: {
      companyId,
      payrollPeriodId: period.id,
      status: { [Op.notIn]: ['REVERSED'] },
    },
    order: [['id', 'DESC']],
  });
  if (!run) {
    run = await PayrollRun.create({
      companyId,
      payrollPeriodId: period.id,
      runNumber: 1,
      runType: 'REGULAR',
      status: 'DRAFT',
      createdBy: userId,
    });
  }

  const zeroNetCount = await PayrollRunEmployee.count({
    where: { companyId, payrollRunId: run.id, netSalary: { [Op.lte]: 0 } },
  });
  if (zeroNetCount > 0 && ['LOCKED', 'APPROVED', 'CALCULATED'].includes(run.status)) {
    await PayrollRunEmployee.destroy({ where: { companyId, payrollRunId: run.id } });
    await run.update({ status: 'DRAFT' });
    await run.reload();
  }
  await run.reload();

  if (run.status === 'DRAFT' || run.status === 'CALCULATED' || run.status === 'UNDER_REVIEW') {
    await generatePayroll({ companyId, payrollRunId: run.id, userId });
    await run.reload();
    if (run.status === 'CALCULATED') {
      await run.update({ status: 'APPROVED', approvedBy: userId });
    }
  }
  if (run.status === 'APPROVED') {
    await run.update({ status: 'LOCKED' });
  }
  ctx.handles.payrollRunId = run.id;
  ctx.handles.payrollPeriodId = period.id;
}

async function phase6Wps(ctx) {
  const { companyId, userId } = ctx;
  const runId = ctx.handles.payrollRunId;

  const { record: wpsCfg } = await findOrCreate(
    PayrollWpsConfiguration,
    { companyId, status: 'ACTIVE' },
    {
      molEstablishmentId: code('MOL-EST'),
      agentName: 'Demo WPS Agent',
      agentCode: code('AGENT'),
      payerBankName: 'Emirates NBD',
      payerBankIban: demoIban('0'),
      salaryCurrency: 'AED',
      status: 'ACTIVE',
    }
  );
  if (!wpsCfg.molEstablishmentId) {
    await wpsCfg.update({ molEstablishmentId: code('MOL-EST'), payerBankIban: demoIban('0') });
  }

  let batch = await PayrollWpsBatch.findOne({
    where: { companyId, payrollRunId: runId },
    order: [['id', 'DESC']],
  });
  if (!batch || batch.status === 'CANCELLED') {
    const result = await generateWpsBatch({ companyId, payrollRunId: runId, userId });
    batch = result.batch;
  }
  if (['GENERATED', 'DRAFT'].includes(batch.status)) await reviewBatch(companyId, batch.id);
  if (['GENERATED', 'UNDER_REVIEW'].includes(batch.status)) {
    await approveBatch(companyId, batch.id, userId);
    await batch.reload();
  }
  if (batch.status === 'APPROVED') {
    await exportBatch(companyId, batch.id, userId);
    await batch.reload();
  }
  ctx.handles.wpsBatchId = batch.id;
}

async function phase7Settlement(ctx) {
  const { companyId, userId } = ctx;
  const sepEmp = ctx.handles.employees.sep;

  await findOrCreate(
    PayrollEosConfiguration,
    { companyId, ruleName: code('EOS-DEFAULT'), contractType: 'ALL' },
    {
      minimumServiceMonths: 12,
      gratuityFormulaType: 'RULE_BASED',
      dailySalaryBasis: 'BASIC_DIV_30',
      active: true,
    }
  ).then(async ({ record: eosCfg }) => {
    await findOrCreate(
      PayrollEosRuleTier,
      { companyId, eosConfigurationId: eosCfg.id, serviceYearsFrom: 0 },
      { gratuityDaysPerYear: 21, serviceYearsTo: 5 }
    );
    await findOrCreate(
      PayrollEosRuleTier,
      { companyId, eosConfigurationId: eosCfg.id, serviceYearsFrom: 5 },
      { gratuityDaysPerYear: 30, serviceYearsTo: null }
    );
  });

  let separation = await EmployeeSeparation.findOne({
    where: { companyId, employeeId: sepEmp.id, status: { [Op.notIn]: ['CANCELLED'] } },
  });
  if (!separation) {
    separation = await EmployeeSeparation.create({
      companyId,
      employeeId: sepEmp.id,
      separationType: 'RESIGNATION',
      lastWorkingDay: '2026-06-28',
      noticeDays: 30,
      servedNoticeDays: 30,
      reason: 'Demo full-cycle separation',
      status: 'DRAFT',
      createdBy: userId,
    });
  }
  if (separation.status === 'DRAFT') await separation.update({ status: 'SUBMITTED' });
  if (['DRAFT', 'SUBMITTED'].includes(separation.status)) {
    await separation.update({ status: 'APPROVED', approvedBy: userId });
  }

  let settlement = await PayrollFinalSettlement.findOne({
    where: { companyId, separationId: separation.id, status: { [Op.notIn]: ['CANCELLED'] } },
  });
  if (!settlement) {
    settlement = await PayrollFinalSettlement.create({
      companyId,
      employeeId: sepEmp.id,
      separationId: separation.id,
      settlementNumber: 9000 + sepEmp.id,
      settlementDate: separation.lastWorkingDay,
      status: 'DRAFT',
      createdBy: userId,
    });
  }
  if (settlement.status === 'DRAFT') {
    await generateFinalSettlement({ companyId, settlementId: settlement.id, userId });
    await settlement.reload();
  }
  if (settlement.status === 'CALCULATED') {
    await approveSettlement(companyId, settlement.id, userId);
    await settlement.reload();
  }
  if (settlement.status === 'APPROVED') {
    await lockSettlement(companyId, settlement.id);
    await settlement.reload();
  }
  ctx.handles.separationId = separation.id;
  ctx.handles.settlementId = settlement.id;
}

async function phase8Finance(ctx, req) {
  const run = await PayrollRun.findByPk(ctx.handles.payrollRunId);
  if (run && run.financePostingStatus !== 'POSTED') {
    await postPayrollRun({ req, runId: run.id });
  }
  const settlement = await PayrollFinalSettlement.findByPk(ctx.handles.settlementId);
  if (settlement && settlement.financePostingStatus !== 'POSTED') {
    await postSettlement({ req, settlementId: settlement.id });
  }
}

async function phase9Documents(ctx, req) {
  const runId = ctx.handles.payrollRunId;
  const run = await PayrollRun.findByPk(runId);
  if (run?.status === 'LOCKED') {
    await generateBatchPayslips({ req, payrollRunId: runId });
    await publishPayslips({ req, payrollRunId: runId });
  }
  const firstEmp = ctx.handles.employees.e01;
  if (firstEmp) await generateCertificate({ req, employeeId: firstEmp.id, certificateType: 'SALARY' });
  if (ctx.handles.settlementId) {
    await generateSettlementStatement({ req, settlementId: ctx.handles.settlementId });
  }
  if (firstEmp) await generateLedgerStatement({ req, employeeId: firstEmp.id });
  await createExport({
    req,
    reportType: 'payroll_register',
    format: 'xlsx',
    parameters: { run_id: runId },
  });
  await createExport({
    req,
    reportType: 'payslip_register',
    format: 'xlsx',
    parameters: { run_id: runId },
  });
}

async function runAllPhases(ctx, req) {
  console.log('Phase 0: Prerequisites...');
  await phase0Prerequisites(ctx);
  console.log('Phase 1: Organization & masters...');
  await phase1Masters(ctx);
  console.log('Phase 2: Employees...');
  await phase2Employees(ctx);
  console.log('Phase 3: Leave & attendance...');
  await phase3Attendance(ctx, req);
  console.log('Phase 4: Adjustments & loans...');
  await phase4Adjustments(ctx);
  console.log('Phase 5: Payroll run...');
  await phase5PayrollRun(ctx);
  console.log('Phase 6: WPS...');
  await phase6Wps(ctx);
  console.log('Phase 7: Final settlement...');
  await phase7Settlement(ctx);
  console.log('Phase 8: Finance posting...');
  await phase8Finance(ctx, req);
  console.log('Phase 9: Documents...');
  await phase9Documents(ctx, req);
  return ctx;
}

module.exports = { runAllPhases };
