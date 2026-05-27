const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const companyIdField = {
  type: DataTypes.INTEGER,
  allowNull: false,
  field: 'company_id',
};

const modelOpts = (tableName) => ({
  tableName,
  timestamps: true,
  underscored: true,
});

const PayrollLeaveOpeningBalance = sequelize.define(
  'PayrollLeaveOpeningBalance',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    leaveTypeId: { type: DataTypes.INTEGER, allowNull: false, field: 'leave_type_id' },
    balanceYear: { type: DataTypes.INTEGER, allowNull: false, field: 'balance_year' },
    openingDays: { type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0, field: 'opening_days' },
    usedDays: { type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0, field: 'used_days' },
    adjustedDays: { type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0, field: 'adjusted_days' },
    availableDays: { type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0, field: 'available_days' },
    status: { type: DataTypes.ENUM('DRAFT', 'APPROVED', 'LOCKED'), allowNull: false, defaultValue: 'DRAFT' },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
  },
  modelOpts('payroll_leave_opening_balances')
);

const PayrollLeaveApplication = sequelize.define(
  'PayrollLeaveApplication',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    leaveTypeId: { type: DataTypes.INTEGER, allowNull: false, field: 'leave_type_id' },
    fromDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'from_date' },
    toDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'to_date' },
    totalDays: { type: DataTypes.DECIMAL(8, 2), allowNull: false, field: 'total_days' },
    halfDay: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'half_day' },
    reason: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    approvalLevel: { type: DataTypes.INTEGER, allowNull: true, field: 'approval_level' },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
    rejectedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'rejected_by' },
    rejectedAt: { type: DataTypes.DATE, allowNull: true, field: 'rejected_at' },
    rejectionReason: { type: DataTypes.TEXT, allowNull: true, field: 'rejection_reason' },
    cancelledBy: { type: DataTypes.INTEGER, allowNull: true, field: 'cancelled_by' },
    cancelledAt: { type: DataTypes.DATE, allowNull: true, field: 'cancelled_at' },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
  },
  modelOpts('payroll_leave_applications')
);

const PayrollAttendanceLog = sequelize.define(
  'PayrollAttendanceLog',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    attendanceDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'attendance_date' },
    checkInTime: { type: DataTypes.STRING(20), allowNull: true, field: 'check_in_time' },
    checkOutTime: { type: DataTypes.STRING(20), allowNull: true, field: 'check_out_time' },
    source: { type: DataTypes.ENUM('MANUAL', 'IMPORT', 'BIOMETRIC', 'SYSTEM'), allowNull: false, defaultValue: 'MANUAL' },
    deviceId: { type: DataTypes.STRING(100), allowNull: true, field: 'device_id' },
    location: { type: DataTypes.STRING(200), allowNull: true },
    rawPayload: { type: DataTypes.JSON, allowNull: true, field: 'raw_payload' },
    status: { type: DataTypes.ENUM('RAW', 'VALIDATED', 'ERROR', 'IGNORED'), allowNull: false, defaultValue: 'RAW' },
  },
  modelOpts('payroll_attendance_logs')
);

const PayrollAttendanceDailySummary = sequelize.define(
  'PayrollAttendanceDailySummary',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    attendanceDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'attendance_date' },
    shiftId: { type: DataTypes.INTEGER, allowNull: true, field: 'shift_id' },
    workCalendarId: { type: DataTypes.INTEGER, allowNull: true, field: 'work_calendar_id' },
    scheduledHours: { type: DataTypes.DECIMAL(8, 2), allowNull: true, field: 'scheduled_hours' },
    actualHours: { type: DataTypes.DECIMAL(8, 2), allowNull: true, field: 'actual_hours' },
    lateMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'late_minutes' },
    earlyLeaveMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'early_leave_minutes' },
    overtimeHours: { type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0, field: 'overtime_hours' },
    absenceType: { type: DataTypes.STRING(50), allowNull: true, field: 'absence_type' },
    attendanceStatus: {
      type: DataTypes.ENUM(
        'PRESENT',
        'ABSENT',
        'ON_LEAVE',
        'HOLIDAY',
        'WEEK_OFF',
        'HALF_DAY',
        'UNPAID_LEAVE',
        'MISSING_PUNCH'
      ),
      allowNull: false,
      defaultValue: 'PRESENT',
      field: 'attendance_status',
    },
    source: { type: DataTypes.STRING(50), allowNull: true },
    isManualAdjustment: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_manual_adjustment' },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
    locked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  modelOpts('payroll_attendance_daily_summaries')
);

const PayrollLabourTimesheet = sequelize.define(
  'PayrollLabourTimesheet',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    timesheetMonth: { type: DataTypes.INTEGER, allowNull: false, field: 'timesheet_month' },
    timesheetYear: { type: DataTypes.INTEGER, allowNull: false, field: 'timesheet_year' },
    departmentId: { type: DataTypes.INTEGER, allowNull: true, field: 'department_id' },
    costCenterId: { type: DataTypes.INTEGER, allowNull: true, field: 'cost_center_id' },
    status: {
      type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
    lockedAt: { type: DataTypes.DATE, allowNull: true, field: 'locked_at' },
  },
  modelOpts('payroll_labour_timesheets')
);

const PayrollLabourTimesheetLine = sequelize.define(
  'PayrollLabourTimesheetLine',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    timesheetId: { type: DataTypes.INTEGER, allowNull: false, field: 'timesheet_id' },
    companyId: companyIdField,
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    workDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'work_date' },
    normalHours: { type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0, field: 'normal_hours' },
    overtimeHours: { type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0, field: 'overtime_hours' },
    holidayHours: { type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0, field: 'holiday_hours' },
    absenceHours: { type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0, field: 'absence_hours' },
    remarks: { type: DataTypes.TEXT, allowNull: true },
  },
  modelOpts('payroll_labour_timesheet_lines')
);

const PayrollOvertimeRequest = sequelize.define(
  'PayrollOvertimeRequest',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    workDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'work_date' },
    requestedHours: { type: DataTypes.DECIMAL(8, 2), allowNull: false, field: 'requested_hours' },
    approvedHours: { type: DataTypes.DECIMAL(8, 2), allowNull: true, field: 'approved_hours' },
    reason: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'DRAFT',
    },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
  },
  modelOpts('payroll_overtime_requests')
);

const PayrollAttendancePeriod = sequelize.define(
  'PayrollAttendancePeriod',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    periodMonth: { type: DataTypes.INTEGER, allowNull: false, field: 'period_month' },
    periodYear: { type: DataTypes.INTEGER, allowNull: false, field: 'period_year' },
    fromDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'from_date' },
    toDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'to_date' },
    status: {
      type: DataTypes.ENUM('OPEN', 'GENERATED', 'UNDER_REVIEW', 'APPROVED', 'LOCKED'),
      allowNull: false,
      defaultValue: 'OPEN',
    },
    generatedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'generated_by' },
    generatedAt: { type: DataTypes.DATE, allowNull: true, field: 'generated_at' },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
    lockedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'locked_by' },
    lockedAt: { type: DataTypes.DATE, allowNull: true, field: 'locked_at' },
  },
  modelOpts('payroll_attendance_periods')
);

function wireP2Associations({ Employee, LeaveType, ShiftMaster, WorkCalendar, Department, CostCenter }) {
  PayrollLeaveOpeningBalance.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
  PayrollLeaveOpeningBalance.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', as: 'leaveType' });

  PayrollLeaveApplication.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
  PayrollLeaveApplication.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', as: 'leaveType' });

  PayrollAttendanceLog.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

  PayrollAttendanceDailySummary.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
  PayrollAttendanceDailySummary.belongsTo(ShiftMaster, { foreignKey: 'shiftId', as: 'shift' });
  PayrollAttendanceDailySummary.belongsTo(WorkCalendar, { foreignKey: 'workCalendarId', as: 'workCalendar' });

  PayrollLabourTimesheet.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
  PayrollLabourTimesheet.belongsTo(CostCenter, { foreignKey: 'costCenterId', as: 'costCenter' });
  PayrollLabourTimesheet.hasMany(PayrollLabourTimesheetLine, { foreignKey: 'timesheetId', as: 'lines' });
  PayrollLabourTimesheetLine.belongsTo(PayrollLabourTimesheet, { foreignKey: 'timesheetId', as: 'timesheet' });
  PayrollLabourTimesheetLine.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

  PayrollOvertimeRequest.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
}

module.exports = {
  PayrollLeaveOpeningBalance,
  PayrollLeaveApplication,
  PayrollAttendanceLog,
  PayrollAttendanceDailySummary,
  PayrollLabourTimesheet,
  PayrollLabourTimesheetLine,
  PayrollOvertimeRequest,
  PayrollAttendancePeriod,
  wireP2Associations,
};
