const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware, requirePermission } = require('../../middleware/authMiddleware');
const { resolveCompanyContext } = require('../../middleware/resolveCompanyContext');

const org = require('../../controllers/payrollOrganizationController');
const emp = require('../../controllers/payrollEmployeeController');
const doc = require('../../controllers/payrollDocumentController');
const sal = require('../../controllers/payrollSalaryController');
const leave = require('../../controllers/payrollLeaveController');
const comp = require('../../controllers/payrollComponentController');
const shift = require('../../controllers/payrollShiftController');
const leaveOb = require('../../controllers/payrollLeaveOpeningBalanceController');
const leaveApp = require('../../controllers/payrollLeaveApplicationController');
const attendance = require('../../controllers/payrollAttendanceController');
const timesheet = require('../../controllers/payrollTimesheetController');
const overtime = require('../../controllers/payrollOvertimeController');
const attPeriod = require('../../controllers/payrollAttendancePeriodController');
const p2Reports = require('../../controllers/payrollP2ReportController');
const payPeriod = require('../../controllers/payrollPeriodController');
const payRun = require('../../controllers/payrollRunController');
const payAdj = require('../../controllers/payrollAdjustmentController');
const payLoan = require('../../controllers/payrollLoanController');
const payReg = require('../../controllers/payrollRegisterController');
const wpsConfig = require('../../controllers/payrollWpsConfigController');
const wpsBatch = require('../../controllers/payrollWpsBatchController');
const wpsCompliance = require('../../controllers/payrollComplianceController');
const wpsEmp = require('../../controllers/payrollEmployeeWpsController');
const wpsGpssa = require('../../controllers/payrollGpssaController');
const wpsEmir = require('../../controllers/payrollEmiratisationController');
const wpsReports = require('../../controllers/payrollWpsReportController');
const eosConfig = require('../../controllers/payrollEosConfigController');
const separation = require('../../controllers/payrollSeparationController');
const settlement = require('../../controllers/payrollFinalSettlementController');
const settlementReports = require('../../controllers/payrollSettlementReportController');
const payAccountConfig = require('../../controllers/payrollAccountConfigController');
const payFinancePost = require('../../controllers/payrollFinancePostingController');
const payEmpLedger = require('../../controllers/payrollEmployeeLedgerController');
const payFinanceReports = require('../../controllers/payrollFinanceReportController');
const payPayslip = require('../../controllers/payrollPayslipController');
const payCert = require('../../controllers/payrollCertificateController');
const paySettleDoc = require('../../controllers/payrollSettlementDocumentController');
const payLedgerStmt = require('../../controllers/payrollLedgerStatementController');
const payExport = require('../../controllers/payrollExportController');
const payDist = require('../../controllers/payrollDistributionController');
const payDocHub = require('../../controllers/payrollDocumentsHubController');
const payWorkspace = require('../../controllers/payrollWorkspaceController');

const router = express.Router();

const uploadDir = path.join(__dirname, '../../../uploads/payroll');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(authMiddleware);
router.use(resolveCompanyContext);

// Workspace aggregates (read-only)
router.get('/dashboard/command-center', requirePermission('payroll.attendance.view'), payWorkspace.commandCenter);
router.get('/employees/:id/360', requirePermission('payroll.employee.view'), payWorkspace.employee360);
router.get('/attendance/exceptions', requirePermission('payroll.attendance.view'), payWorkspace.attendanceExceptions);
router.get('/runs/:id/detail', requirePermission('payroll.processing.view'), payWorkspace.runDetail);
router.get('/runs/:id/employees/:employeeId/line', requirePermission('payroll.processing.view'), payWorkspace.runEmployeeLine);
router.get('/wps/batches/:id/detail', requirePermission('payroll.wps.view'), payWorkspace.wpsBatchDetail);
router.get('/settlements/:id/detail', requirePermission('payroll.settlement.view'), payWorkspace.settlementDetail);
router.get('/reports/cost-allocation', requirePermission('payroll.processing.view'), payWorkspace.costAllocation);
router.get('/audit', requirePermission('payroll.processing.view'), payWorkspace.audit);

// Organization
router.get('/organization/entities', requirePermission('payroll.organization.view'), org.listEntities);
router.get('/organization/:entity', requirePermission('payroll.organization.view'), org.list);
router.get('/organization/:entity/:id', requirePermission('payroll.organization.view'), org.getById);
router.post('/organization/:entity', requirePermission('payroll.organization.manage'), org.create);
router.put('/organization/:entity/:id', requirePermission('payroll.organization.manage'), org.update);
router.delete('/organization/:entity/:id', requirePermission('payroll.organization.manage'), org.remove);

// Employees
router.get('/employees', requirePermission('payroll.employee.view'), emp.list);
router.get('/employees/:id', requirePermission('payroll.employee.view'), emp.getById);
router.post('/employees', requirePermission('payroll.employee.manage'), emp.create);
router.put('/employees/:id', requirePermission('payroll.employee.manage'), emp.update);
router.delete('/employees/:id', requirePermission('payroll.employee.manage'), emp.remove);
router.post('/employees/:id/history', requirePermission('payroll.employee.manage'), emp.addHistory);
router.post('/employees/:id/assignments', requirePermission('payroll.employee.manage'), emp.addAssignment);

// Documents
router.get('/documents/expiring', requirePermission('payroll.document.view'), doc.listExpiring);
router.get('/documents/employee/:employeeId', requirePermission('payroll.document.view'), doc.listByEmployee);
router.post(
  '/documents',
  requirePermission('payroll.document.manage'),
  upload.single('attachment'),
  doc.create
);
router.put(
  '/documents/:id',
  requirePermission('payroll.document.manage'),
  upload.single('attachment'),
  doc.update
);
router.delete('/documents/:id', requirePermission('payroll.document.manage'), doc.remove);

// Salary structures
router.get('/salary-structure', requirePermission('payroll.salary.view'), sal.list);
router.get('/salary-structure/:id', requirePermission('payroll.salary.view'), sal.getById);
router.post('/salary-structure', requirePermission('payroll.salary.manage'), sal.create);
router.put('/salary-structure/:id', requirePermission('payroll.salary.manage'), sal.update);
router.delete('/salary-structure/:id', requirePermission('payroll.salary.manage'), sal.remove);

// Leave policy
router.get('/leave-policy/types', requirePermission('payroll.policy.view'), leave.listLeaveTypes);
router.post('/leave-policy/types', requirePermission('payroll.policy.manage'), leave.createLeaveType);
router.put('/leave-policy/types/:id', requirePermission('payroll.policy.manage'), leave.updateLeaveType);
router.delete('/leave-policy/types/:id', requirePermission('payroll.policy.manage'), leave.removeLeaveType);
router.get('/leave-policy/policies', requirePermission('payroll.policy.view'), leave.listPolicies);
router.post('/leave-policy/policies', requirePermission('payroll.policy.manage'), leave.createPolicy);
router.put('/leave-policy/policies/:id', requirePermission('payroll.policy.manage'), leave.updatePolicy);
router.get('/leave-policy/assignments', requirePermission('payroll.policy.view'), leave.listAssignments);
router.post('/leave-policy/assignments', requirePermission('payroll.policy.manage'), leave.assignPolicy);

// Payroll components
router.get('/payroll-components', requirePermission('payroll.policy.view'), comp.list);
router.get('/payroll-components/:id', requirePermission('payroll.policy.view'), comp.getById);
router.post('/payroll-components', requirePermission('payroll.policy.manage'), comp.create);
router.put('/payroll-components/:id', requirePermission('payroll.policy.manage'), comp.update);
router.delete('/payroll-components/:id', requirePermission('payroll.policy.manage'), comp.remove);

// Shift / calendars
router.get('/shift/shifts', requirePermission('payroll.policy.view'), shift.listShifts);
router.post('/shift/shifts', requirePermission('payroll.policy.manage'), shift.createShift);
router.get('/shift/shifts/:id', requirePermission('payroll.policy.view'), shift.getShift);
router.put('/shift/shifts/:id', requirePermission('payroll.policy.manage'), shift.updateShift);
router.delete('/shift/shifts/:id', requirePermission('payroll.policy.manage'), shift.removeShift);

router.get('/shift/holiday-calendars', requirePermission('payroll.policy.view'), shift.listHolidayCalendars);
router.post('/shift/holiday-calendars', requirePermission('payroll.policy.manage'), shift.createHolidayCalendar);
router.get('/shift/holiday-calendars/:id', requirePermission('payroll.policy.view'), shift.getHolidayCalendar);
router.put('/shift/holiday-calendars/:id', requirePermission('payroll.policy.manage'), shift.updateHolidayCalendar);
router.delete('/shift/holiday-calendars/:id', requirePermission('payroll.policy.manage'), shift.removeHolidayCalendar);
router.get('/shift/holiday-calendars/:id/dates', requirePermission('payroll.policy.view'), shift.listHolidayDates);
router.post('/shift/holiday-calendars/:id/dates', requirePermission('payroll.policy.manage'), shift.addHolidayDate);

router.get('/shift/work-calendars', requirePermission('payroll.policy.view'), shift.listWorkCalendars);
router.post('/shift/work-calendars', requirePermission('payroll.policy.manage'), shift.createWorkCalendar);
router.get('/shift/work-calendars/:id', requirePermission('payroll.policy.view'), shift.getWorkCalendar);
router.put('/shift/work-calendars/:id', requirePermission('payroll.policy.manage'), shift.updateWorkCalendar);
router.delete('/shift/work-calendars/:id', requirePermission('payroll.policy.manage'), shift.removeWorkCalendar);

// P2 — Leave operations
router.get('/leave-opening-balances', requirePermission('payroll.leave.operations.view'), leaveOb.list);
router.post('/leave-opening-balances', requirePermission('payroll.leave.operations.manage'), leaveOb.create);
router.post('/leave-opening-balances/:id/approve', requirePermission('payroll.leave.operations.manage'), leaveOb.approve);

router.get('/leave-applications', requirePermission('payroll.leave.operations.view'), leaveApp.list);
router.post('/leave-applications', requirePermission('payroll.leave.operations.manage'), leaveApp.create);
router.post('/leave-applications/:id/submit', requirePermission('payroll.leave.operations.manage'), leaveApp.submit);
router.post('/leave-applications/:id/approve', requirePermission('payroll.leave.operations.manage'), leaveApp.approve);
router.post('/leave-applications/:id/reject', requirePermission('payroll.leave.operations.manage'), leaveApp.reject);
router.post('/leave-applications/:id/cancel', requirePermission('payroll.leave.operations.manage'), leaveApp.cancel);

// P2 — Attendance
router.get('/attendance/logs', requirePermission('payroll.attendance.view'), attendance.listLogs);
router.post('/attendance/logs', requirePermission('payroll.attendance.manage'), attendance.createLog);
router.post('/attendance/logs/import', requirePermission('payroll.attendance.manage'), attendance.importLogs);
router.get('/attendance/daily-summaries', requirePermission('payroll.attendance.view'), attendance.listDailySummaries);
router.post('/attendance/daily-summaries/adjust', requirePermission('payroll.attendance.manage'), attendance.adjustDaily);
router.post('/attendance/generate-staff', requirePermission('payroll.attendance.manage'), attendance.generateStaff);
router.get('/attendance/monthly-summary', requirePermission('payroll.attendance.view'), attendance.monthlySummary);
router.get('/attendance/payroll-readiness', requirePermission('payroll.attendance.view'), attendance.payrollReadiness);

// P2 — Labour timesheets
router.get('/labour-timesheets', requirePermission('payroll.attendance.view'), timesheet.list);
router.get('/labour-timesheets/:id', requirePermission('payroll.attendance.view'), timesheet.getById);
router.post('/labour-timesheets', requirePermission('payroll.attendance.manage'), timesheet.create);
router.put('/labour-timesheets/:id', requirePermission('payroll.attendance.manage'), timesheet.update);
router.post('/labour-timesheets/:id/submit', requirePermission('payroll.attendance.manage'), timesheet.submit);
router.post('/labour-timesheets/:id/approve', requirePermission('payroll.attendance.manage'), timesheet.approve);

// P2 — Overtime
router.get('/overtime-requests', requirePermission('payroll.attendance.view'), overtime.list);
router.post('/overtime-requests', requirePermission('payroll.attendance.manage'), overtime.create);
router.post('/overtime-requests/:id/submit', requirePermission('payroll.attendance.manage'), overtime.submit);
router.post('/overtime-requests/:id/approve', requirePermission('payroll.attendance.manage'), overtime.approve);
router.post('/overtime-requests/:id/reject', requirePermission('payroll.attendance.manage'), overtime.reject);

// P2 — Attendance periods
router.get('/attendance-periods', requirePermission('payroll.attendance.view'), attPeriod.list);
router.post('/attendance-periods/generate', requirePermission('payroll.attendance.manage'), attPeriod.generate);
router.post('/attendance-periods/:id/approve', requirePermission('payroll.attendance.manage'), attPeriod.approve);
router.post('/attendance-periods/:id/lock', requirePermission('payroll.attendance.manage'), attPeriod.lock);

// P2 — Reports & operations dashboard
router.get('/operations/dashboard', requirePermission('payroll.attendance.view'), p2Reports.operationsDashboard);
router.get('/reports/monthly-attendance', requirePermission('payroll.attendance.view'), p2Reports.monthlyAttendance);
router.get('/reports/labour-timesheet', requirePermission('payroll.attendance.view'), p2Reports.labourTimesheet);
router.get('/reports/leave-balance', requirePermission('payroll.leave.operations.view'), p2Reports.leaveBalance);
router.get('/reports/leave-transaction', requirePermission('payroll.leave.operations.view'), p2Reports.leaveTransaction);
router.get('/reports/overtime-approval', requirePermission('payroll.attendance.view'), p2Reports.overtimeApproval);
router.get('/reports/attendance-exception', requirePermission('payroll.attendance.view'), p2Reports.attendanceException);

// P3 — Payroll periods
router.get('/payroll-periods', requirePermission('payroll.processing.view'), payPeriod.list);
router.post('/payroll-periods/generate', requirePermission('payroll.processing.manage'), payPeriod.generate);
router.post('/payroll-periods/:id/approve', requirePermission('payroll.processing.approve'), payPeriod.approve);
router.post('/payroll-periods/:id/lock', requirePermission('payroll.processing.approve'), payPeriod.lock);

// P3 — Payroll runs
router.get('/runs', requirePermission('payroll.processing.view'), payRun.list);
router.post('/runs', requirePermission('payroll.processing.manage'), payRun.create);
router.get('/runs/:id', requirePermission('payroll.processing.view'), payRun.getById);
router.post('/runs/:id/calculate', requirePermission('payroll.processing.manage'), payRun.calculate);
router.post('/runs/:id/approve', requirePermission('payroll.processing.approve'), payRun.approve);
router.post('/runs/:id/lock', requirePermission('payroll.processing.approve'), payRun.lock);
router.post('/runs/:id/reverse', requirePermission('payroll.processing.approve'), payRun.reverse);

// P3 — Adjustments
router.get('/adjustments', requirePermission('payroll.processing.view'), payAdj.list);
router.post('/adjustments', requirePermission('payroll.processing.manage'), payAdj.create);
router.post('/adjustments/:id/approve', requirePermission('payroll.processing.approve'), payAdj.approve);

// P3 — Loans
router.get('/loans', requirePermission('payroll.processing.view'), payLoan.listLoans);
router.post('/loans', requirePermission('payroll.processing.manage'), payLoan.createLoan);
router.get('/loans/:loanId/installments', requirePermission('payroll.processing.view'), payLoan.listInstallments);
router.post('/loans/:loanId/installments', requirePermission('payroll.processing.manage'), payLoan.addInstallment);
router.post('/loan-installments/:id/approve', requirePermission('payroll.processing.approve'), payLoan.approveInstallment);

// P3 — Register, variance, calculation dashboard
router.get('/register', requirePermission('payroll.processing.view'), payReg.register);
router.get('/variance', requirePermission('payroll.processing.view'), payReg.variance);
router.get('/calculation/dashboard', requirePermission('payroll.processing.view'), payReg.dashboard);

// P4 — WPS configuration
router.get('/wps/configurations', requirePermission('payroll.wps.view'), wpsConfig.list);
router.post('/wps/configurations', requirePermission('payroll.wps.manage'), wpsConfig.create);
router.put('/wps/configurations/:id', requirePermission('payroll.wps.manage'), wpsConfig.update);

// P4 — Employee WPS bank
router.put('/employees/:id/wps-bank', requirePermission('payroll.wps.manage'), wpsEmp.updateWpsBank);

// P4 — Compliance & batches
router.get('/wps/compliance', requirePermission('payroll.wps.view'), wpsCompliance.check);
router.post('/wps/generate', requirePermission('payroll.wps.manage'), wpsBatch.generate);
router.get('/wps/batches', requirePermission('payroll.wps.view'), wpsBatch.list);
router.get('/wps/batches/:id', requirePermission('payroll.wps.view'), wpsBatch.getById);
router.post('/wps/batches/:id/review', requirePermission('payroll.wps.manage'), wpsBatch.review);
router.post('/wps/batches/:id/approve', requirePermission('payroll.wps.approve'), wpsBatch.approve);
router.post('/wps/batches/:id/export', requirePermission('payroll.wps.approve'), wpsBatch.export);
router.post('/wps/batches/:id/cancel', requirePermission('payroll.wps.manage'), wpsBatch.cancel);

// P4 — GPSSA & emiratisation
router.get('/gpssa/configuration', requirePermission('payroll.wps.view'), wpsGpssa.getConfiguration);
router.put('/gpssa/configuration', requirePermission('payroll.wps.manage'), wpsGpssa.updateConfiguration);
router.get('/emiratisation', requirePermission('payroll.wps.view'), wpsEmir.getMetrics);

// P4 — Dashboard & reports
router.get('/wps/dashboard', requirePermission('payroll.wps.view'), wpsReports.dashboard);
router.get('/wps/reports/register', requirePermission('payroll.wps.view'), wpsReports.register);
router.get('/wps/reports/sif-history', requirePermission('payroll.wps.view'), wpsReports.sifHistory);
router.get('/wps/reports/compliance-exceptions', requirePermission('payroll.wps.view'), wpsReports.complianceExceptions);
router.get('/wps/reports/bank-validation', requirePermission('payroll.wps.view'), wpsReports.bankValidation);
router.get('/wps/reports/emiratisation', requirePermission('payroll.wps.view'), wpsReports.emiratisationReport);
router.get('/wps/reports/gpssa-eligibility', requirePermission('payroll.wps.view'), wpsReports.gpssaEligibility);

// P5 — EOS configuration
router.get('/eos/configurations', requirePermission('payroll.settlement.view'), eosConfig.list);
router.post('/eos/configurations', requirePermission('payroll.settlement.manage'), eosConfig.create);
router.put('/eos/configurations/:id', requirePermission('payroll.settlement.manage'), eosConfig.update);
router.get('/eos/configurations/:id/tiers', requirePermission('payroll.settlement.view'), eosConfig.listTiers);
router.post('/eos/configurations/:id/tiers', requirePermission('payroll.settlement.manage'), eosConfig.createTier);
router.put('/eos/configurations/:id/tiers/:tierId', requirePermission('payroll.settlement.manage'), eosConfig.updateTier);
router.delete('/eos/configurations/:id/tiers/:tierId', requirePermission('payroll.settlement.manage'), eosConfig.removeTier);

// P5 — Separations
router.get('/separations', requirePermission('payroll.settlement.view'), separation.list);
router.post('/separations', requirePermission('payroll.settlement.manage'), separation.create);
router.get('/separations/:id', requirePermission('payroll.settlement.view'), separation.getById);
router.put('/separations/:id', requirePermission('payroll.settlement.manage'), separation.update);
router.post('/separations/:id/submit', requirePermission('payroll.settlement.manage'), separation.submit);
router.post('/separations/:id/approve', requirePermission('payroll.settlement.approve'), separation.approve);
router.post('/separations/:id/cancel', requirePermission('payroll.settlement.manage'), separation.cancel);

// P5 — Final settlements
router.get('/settlements', requirePermission('payroll.settlement.view'), settlement.list);
router.post('/settlements', requirePermission('payroll.settlement.manage'), settlement.create);
router.get('/settlements/:id', requirePermission('payroll.settlement.view'), settlement.getById);
router.post('/settlements/:id/calculate', requirePermission('payroll.settlement.manage'), settlement.calculate);
router.post('/settlements/:id/approve', requirePermission('payroll.settlement.approve'), settlement.approve);
router.post('/settlements/:id/lock', requirePermission('payroll.settlement.approve'), settlement.lock);
router.post('/settlements/:id/cancel', requirePermission('payroll.settlement.manage'), settlement.cancel);

// P5 — Dashboard & reports
router.get('/settlements/dashboard', requirePermission('payroll.settlement.view'), settlementReports.dashboard);
router.get('/settlements/reports/register', requirePermission('payroll.settlement.view'), settlementReports.register);
router.get('/settlements/reports/eos-liability', requirePermission('payroll.settlement.view'), settlementReports.eosLiability);
router.get('/settlements/reports/leave-encashment', requirePermission('payroll.settlement.view'), settlementReports.leaveEncashment);
router.get('/settlements/reports/separations', requirePermission('payroll.settlement.view'), settlementReports.separations);
router.get('/settlements/reports/variance', requirePermission('payroll.settlement.view'), settlementReports.variance);

// P6 — Account configuration
router.get('/account-config', requirePermission('payroll.finance.view'), payAccountConfig.get);
router.put('/account-config', requirePermission('payroll.finance.manage'), payAccountConfig.update);

// P6 — Finance posting
router.post('/post/run/:id', requirePermission('payroll.finance.manage'), payFinancePost.postRun);
router.post('/post/run/:id/reverse', requirePermission('payroll.finance.approve'), payFinancePost.reverseRun);
router.post('/post/settlement/:id', requirePermission('payroll.finance.manage'), payFinancePost.postSettlement);
router.post('/post/settlement/:id/reverse', requirePermission('payroll.finance.approve'), payFinancePost.reverseSettlement);
router.post('/post/wps/:id/clear', requirePermission('payroll.finance.manage'), payFinancePost.postWpsClear);

// P6 — Employee ledger & reconciliation
router.get('/employee-ledger', requirePermission('payroll.finance.view'), payEmpLedger.getLedger);
router.get('/reconciliation', requirePermission('payroll.finance.view'), payFinanceReports.reconciliation);

// P6 — Finance dashboard & reports
router.get('/finance/dashboard', requirePermission('payroll.finance.view'), payFinanceReports.dashboard);
router.get('/finance/reports/posting-register', requirePermission('payroll.finance.view'), payFinanceReports.postingRegister);
router.get('/finance/reports/employee-ledger', requirePermission('payroll.finance.view'), payFinanceReports.employeeLedgerReport);
router.get('/finance/reports/liabilities', requirePermission('payroll.finance.view'), payFinanceReports.liabilities);
router.get('/finance/reports/eos-provision', requirePermission('payroll.finance.view'), payFinanceReports.eosProvision);
router.get('/finance/reports/loan-recovery', requirePermission('payroll.finance.view'), payFinanceReports.loanRecovery);
router.get('/finance/reports/gl-reconciliation', requirePermission('payroll.finance.view'), payFinanceReports.glReconciliation);

// P7 — Payslips (static paths before :id)
router.get('/payslips', requirePermission('payroll.documents.view'), payPayslip.list);
router.post('/payslips/generate', requirePermission('payroll.documents.manage'), payPayslip.generate);
router.post('/payslips/batch', requirePermission('payroll.documents.manage'), payPayslip.batch);
router.post('/payslips/publish', requirePermission('payroll.documents.publish'), payPayslip.publish);
router.get('/payslips/:id/download', requirePermission('payroll.documents.view'), payPayslip.download);
router.get('/payslips/:id', requirePermission('payroll.documents.view'), payPayslip.getById);
router.post('/payslips/:id/void', requirePermission('payroll.documents.manage'), payPayslip.voidPayslip);

// P7 — Certificates
router.get('/certificates', requirePermission('payroll.documents.view'), payCert.list);
router.post('/certificates/generate', requirePermission('payroll.documents.manage'), payCert.generate);
router.get('/certificates/:id/download', requirePermission('payroll.documents.view'), payCert.download);

// P7 — Settlement documents
router.post('/settlement-documents/:settlementId/generate', requirePermission('payroll.documents.manage'), paySettleDoc.generate);
router.get('/settlement-documents/:id/download', requirePermission('payroll.documents.view'), paySettleDoc.download);

// P7 — Ledger statements
router.post('/ledger-statements/generate', requirePermission('payroll.documents.manage'), payLedgerStmt.generate);
router.get('/ledger-statements/:id/download', requirePermission('payroll.documents.view'), payLedgerStmt.download);

// P7 — Exports
router.get('/exports/types', requirePermission('payroll.documents.view'), payExport.listTypes);
router.get('/exports', requirePermission('payroll.documents.view'), payExport.list);
router.post('/exports', requirePermission('payroll.documents.manage'), payExport.create);
router.get('/exports/:id/download', requirePermission('payroll.documents.view'), payExport.download);

// P7 — Distribution (no email send)
router.post('/distribution/prepare', requirePermission('payroll.documents.manage'), payDist.prepare);
router.post('/distribution/archive', requirePermission('payroll.documents.manage'), payDist.archive);
router.get('/distribution/queue', requirePermission('payroll.documents.view'), payDist.queue);
router.post('/distribution/queue/:id/ready', requirePermission('payroll.documents.publish'), payDist.markReady);

// P7 — Documents hub
router.get('/documents-hub/dashboard', requirePermission('payroll.documents.view'), payDocHub.dashboard);
router.get('/documents-hub/reports/payslip-register', requirePermission('payroll.documents.view'), payDocHub.payslipRegister);
router.get('/documents-hub/reports/salary-certificate-register', requirePermission('payroll.documents.view'), payDocHub.salaryCertificateRegister);
router.get('/documents-hub/reports/payroll-history', requirePermission('payroll.documents.view'), payDocHub.payrollHistory);
router.get('/documents-hub/reports/payroll-trend', requirePermission('payroll.documents.view'), payDocHub.payrollTrend);
router.get('/documents-hub/reports/payroll-cost-summary', requirePermission('payroll.documents.view'), payDocHub.payrollCostSummary);

module.exports = router;
