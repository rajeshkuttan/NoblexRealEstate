/**
 * Payroll P1 — workforce governance models (foundation only; no payroll runs).
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const companyIdField = {
  type: DataTypes.INTEGER,
  allowNull: false,
  field: 'company_id',
  references: { model: 'company_settings', key: 'id' },
};

const statusActive = {
  type: DataTypes.ENUM('active', 'inactive'),
  allowNull: false,
  defaultValue: 'active',
};

const modelOpts = (tableName) => ({
  tableName,
  timestamps: true,
  underscored: true,
});

const VisaSponsorCompany = sequelize.define(
  'VisaSponsorCompany',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    sponsorName: { type: DataTypes.STRING(200), allowNull: false, field: 'sponsor_name' },
    tradeLicense: { type: DataTypes.STRING(100), allowNull: true, field: 'trade_license' },
    labourEstablishmentNo: { type: DataTypes.STRING(100), allowNull: true, field: 'labour_establishment_no' },
    molNumber: { type: DataTypes.STRING(100), allowNull: true, field: 'mol_number' },
    immigrationFileNo: { type: DataTypes.STRING(100), allowNull: true, field: 'immigration_file_no' },
    wpsCompanyCode: { type: DataTypes.STRING(50), allowNull: true, field: 'wps_company_code' },
    address: { type: DataTypes.TEXT, allowNull: true },
    contactPerson: { type: DataTypes.STRING(100), allowNull: true, field: 'contact_person' },
    phone: { type: DataTypes.STRING(30), allowNull: true },
    email: { type: DataTypes.STRING(100), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
  },
  modelOpts('visa_sponsor_companies')
);

const PayrollBranch = sequelize.define(
  'PayrollBranch',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    branchCode: { type: DataTypes.STRING(50), allowNull: false, field: 'branch_code' },
    branchName: { type: DataTypes.STRING(200), allowNull: false, field: 'branch_name' },
    status: statusActive,
  },
  modelOpts('payroll_branches')
);

const CostCenter = sequelize.define(
  'CostCenter',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    costCenterCode: { type: DataTypes.STRING(50), allowNull: false, field: 'cost_center_code' },
    costCenterName: { type: DataTypes.STRING(200), allowNull: false, field: 'cost_center_name' },
    status: statusActive,
  },
  modelOpts('cost_centers')
);

const Department = sequelize.define(
  'Department',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    departmentCode: { type: DataTypes.STRING(50), allowNull: false, field: 'department_code' },
    departmentName: { type: DataTypes.STRING(200), allowNull: false, field: 'department_name' },
    parentDepartmentId: { type: DataTypes.INTEGER, allowNull: true, field: 'parent_department_id' },
    managerId: { type: DataTypes.INTEGER, allowNull: true, field: 'manager_id' },
    costCenterId: { type: DataTypes.INTEGER, allowNull: true, field: 'cost_center_id' },
    status: statusActive,
  },
  modelOpts('departments')
);

const EmployeeGrade = sequelize.define(
  'EmployeeGrade',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    gradeCode: { type: DataTypes.STRING(50), allowNull: false, field: 'grade_code' },
    gradeName: { type: DataTypes.STRING(100), allowNull: false, field: 'grade_name' },
    status: statusActive,
  },
  modelOpts('employee_grades')
);

const EmployeeLevel = sequelize.define(
  'EmployeeLevel',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    levelCode: { type: DataTypes.STRING(50), allowNull: false, field: 'level_code' },
    levelName: { type: DataTypes.STRING(100), allowNull: false, field: 'level_name' },
    status: statusActive,
  },
  modelOpts('employee_levels')
);

const EmploymentCategory = sequelize.define(
  'EmploymentCategory',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    categoryCode: { type: DataTypes.STRING(50), allowNull: false, field: 'category_code' },
    categoryName: { type: DataTypes.STRING(100), allowNull: false, field: 'category_name' },
    status: statusActive,
  },
  modelOpts('employment_categories')
);

const Designation = sequelize.define(
  'Designation',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    designationCode: { type: DataTypes.STRING(50), allowNull: false, field: 'designation_code' },
    designationName: { type: DataTypes.STRING(200), allowNull: false, field: 'designation_name' },
    gradeId: { type: DataTypes.INTEGER, allowNull: true, field: 'grade_id' },
    levelId: { type: DataTypes.INTEGER, allowNull: true, field: 'level_id' },
    employmentCategoryId: { type: DataTypes.INTEGER, allowNull: true, field: 'employment_category_id' },
    status: statusActive,
  },
  modelOpts('designations')
);

const WorkforceGroup = sequelize.define(
  'WorkforceGroup',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    groupCode: { type: DataTypes.STRING(50), allowNull: false, field: 'group_code' },
    groupName: { type: DataTypes.STRING(100), allowNull: false, field: 'group_name' },
    status: statusActive,
  },
  modelOpts('workforce_groups')
);

const PayrollGroup = sequelize.define(
  'PayrollGroup',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    groupCode: { type: DataTypes.STRING(50), allowNull: false, field: 'group_code' },
    groupName: { type: DataTypes.STRING(100), allowNull: false, field: 'group_name' },
    status: statusActive,
  },
  modelOpts('payroll_groups')
);

const WorkLocation = sequelize.define(
  'WorkLocation',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    locationCode: { type: DataTypes.STRING(50), allowNull: false, field: 'location_code' },
    locationName: { type: DataTypes.STRING(200), allowNull: false, field: 'location_name' },
    address: { type: DataTypes.TEXT, allowNull: true },
    status: statusActive,
  },
  modelOpts('work_locations')
);

const ShiftMaster = sequelize.define(
  'ShiftMaster',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    shiftCode: { type: DataTypes.STRING(50), allowNull: false, field: 'shift_code' },
    shiftName: { type: DataTypes.STRING(100), allowNull: false, field: 'shift_name' },
    startTime: { type: DataTypes.STRING(10), allowNull: true, field: 'start_time' },
    endTime: { type: DataTypes.STRING(10), allowNull: true, field: 'end_time' },
    breakMinutes: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0, field: 'break_minutes' },
    workDays: { type: DataTypes.STRING(50), allowNull: true, field: 'work_days' },
    overtimeEligible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'overtime_eligible' },
    status: statusActive,
  },
  modelOpts('shift_masters')
);

const HolidayCalendar = sequelize.define(
  'HolidayCalendar',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    calendarCode: { type: DataTypes.STRING(50), allowNull: false, field: 'calendar_code' },
    calendarName: { type: DataTypes.STRING(200), allowNull: false, field: 'calendar_name' },
    year: { type: DataTypes.INTEGER, allowNull: true },
    status: statusActive,
  },
  modelOpts('holiday_calendars')
);

const HolidayCalendarDate = sequelize.define(
  'HolidayCalendarDate',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    holidayCalendarId: { type: DataTypes.INTEGER, allowNull: false, field: 'holiday_calendar_id' },
    holidayDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'holiday_date' },
    description: { type: DataTypes.STRING(200), allowNull: true },
  },
  modelOpts('holiday_calendar_dates')
);

const WorkCalendar = sequelize.define(
  'WorkCalendar',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    calendarCode: { type: DataTypes.STRING(50), allowNull: false, field: 'calendar_code' },
    calendarName: { type: DataTypes.STRING(200), allowNull: false, field: 'calendar_name' },
    workDays: { type: DataTypes.STRING(50), allowNull: true, field: 'work_days' },
    status: statusActive,
  },
  modelOpts('work_calendars')
);

const LeaveType = sequelize.define(
  'LeaveType',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    leaveCode: { type: DataTypes.STRING(50), allowNull: false, field: 'leave_code' },
    leaveName: { type: DataTypes.STRING(100), allowNull: false, field: 'leave_name' },
    isPaid: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_paid' },
    allowNegativeBalance: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'allow_negative_balance',
    },
    status: statusActive,
  },
  modelOpts('leave_types')
);

const LeavePolicy = sequelize.define(
  'LeavePolicy',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    policyCode: { type: DataTypes.STRING(50), allowNull: false, field: 'policy_code' },
    policyName: { type: DataTypes.STRING(200), allowNull: false, field: 'policy_name' },
    leaveTypeId: { type: DataTypes.INTEGER, allowNull: false, field: 'leave_type_id' },
    status: statusActive,
  },
  modelOpts('leave_policies')
);

const LeavePolicyRule = sequelize.define(
  'LeavePolicyRule',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    leavePolicyId: { type: DataTypes.INTEGER, allowNull: false, field: 'leave_policy_id' },
    carryForwardEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'carry_forward_enabled' },
    carryForwardMaxDays: { type: DataTypes.DECIMAL(8, 2), allowNull: true, field: 'carry_forward_max_days' },
    encashmentEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'encashment_enabled' },
    probationRestricted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'probation_restricted' },
    eligibilityDays: { type: DataTypes.INTEGER, allowNull: true, field: 'eligibility_days' },
    annualEntitlementDays: { type: DataTypes.DECIMAL(8, 2), allowNull: true, field: 'annual_entitlement_days' },
  },
  modelOpts('leave_policy_rules')
);

const PayrollComponent = sequelize.define(
  'PayrollComponent',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    componentCode: { type: DataTypes.STRING(50), allowNull: false, field: 'component_code' },
    componentName: { type: DataTypes.STRING(200), allowNull: false, field: 'component_name' },
    componentType: {
      type: DataTypes.ENUM('EARNING', 'DEDUCTION', 'EMPLOYER', 'PROVISION'),
      allowNull: false,
      field: 'component_type',
    },
    taxable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    recurring: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    affectsEos: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'affects_eos' },
    affectsWps: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'affects_wps' },
    calculationMethod: { type: DataTypes.STRING(50), allowNull: true, field: 'calculation_method' },
    overtimeMultiplier: { type: DataTypes.DECIMAL(8, 2), allowNull: true, defaultValue: 1.5, field: 'overtime_multiplier' },
    status: statusActive,
  },
  modelOpts('payroll_components')
);

const Employee = sequelize.define(
  'Employee',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    employeeNo: { type: DataTypes.STRING(50), allowNull: false, field: 'employee_no' },
    employeeName: { type: DataTypes.STRING(200), allowNull: false, field: 'employee_name' },
    arabicName: { type: DataTypes.STRING(200), allowNull: true, field: 'arabic_name' },
    branchId: { type: DataTypes.INTEGER, allowNull: true, field: 'branch_id' },
    departmentId: { type: DataTypes.INTEGER, allowNull: true, field: 'department_id' },
    designationId: { type: DataTypes.INTEGER, allowNull: true, field: 'designation_id' },
    gradeId: { type: DataTypes.INTEGER, allowNull: true, field: 'grade_id' },
    levelId: { type: DataTypes.INTEGER, allowNull: true, field: 'level_id' },
    workforceGroupId: { type: DataTypes.INTEGER, allowNull: true, field: 'workforce_group_id' },
    employmentCategoryId: { type: DataTypes.INTEGER, allowNull: true, field: 'employment_category_id' },
    payrollGroupId: { type: DataTypes.INTEGER, allowNull: true, field: 'payroll_group_id' },
    visaSponsorCompanyId: { type: DataTypes.INTEGER, allowNull: true, field: 'visa_sponsor_company_id' },
    workLocationId: { type: DataTypes.INTEGER, allowNull: true, field: 'work_location_id' },
    nationality: { type: DataTypes.STRING(100), allowNull: true },
    gender: { type: DataTypes.ENUM('male', 'female', 'other'), allowNull: true },
    joiningDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'joining_date' },
    probationEndDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'probation_end_date' },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'terminated'),
      allowNull: false,
      defaultValue: 'active',
    },
    gpssaEligible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'gpssa_eligible' },
    uaeNational: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'uae_national' },
    contractType: {
      type: DataTypes.ENUM('LIMITED', 'UNLIMITED'),
      allowNull: true,
      field: 'contract_type',
    },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
  },
  modelOpts('employees')
);

const LeavePolicyAssignment = sequelize.define(
  'LeavePolicyAssignment',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    leavePolicyId: { type: DataTypes.INTEGER, allowNull: false, field: 'leave_policy_id' },
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    effectiveFrom: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_from' },
    effectiveTo: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_to' },
  },
  modelOpts('leave_policy_assignments')
);

const EmployeeDocument = sequelize.define(
  'EmployeeDocument',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    documentType: {
      type: DataTypes.ENUM('passport', 'visa', 'emirates_id', 'labour_card', 'medical_insurance', 'driving_license', 'contract', 'other'),
      allowNull: false,
      field: 'document_type',
    },
    documentNumber: { type: DataTypes.STRING(100), allowNull: true, field: 'document_number' },
    issueDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'issue_date' },
    expiryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'expiry_date' },
    attachmentPath: { type: DataTypes.STRING(500), allowNull: true, field: 'attachment_path' },
    alertDaysBefore: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30, field: 'alert_days_before' },
  },
  modelOpts('employee_documents')
);

const EmployeeBankDetail = sequelize.define(
  'EmployeeBankDetail',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    bankName: { type: DataTypes.STRING(200), allowNull: true, field: 'bank_name' },
    accountNumber: { type: DataTypes.STRING(50), allowNull: true, field: 'account_number' },
    iban: { type: DataTypes.STRING(50), allowNull: true },
    swiftCode: { type: DataTypes.STRING(20), allowNull: true, field: 'swift_code' },
    isPrimary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_primary' },
    bankCode: { type: DataTypes.STRING(20), allowNull: true, field: 'bank_code' },
    salaryCardNo: { type: DataTypes.STRING(50), allowNull: true, field: 'salary_card_no' },
    labourCardNo: { type: DataTypes.STRING(50), allowNull: true, field: 'labour_card_no' },
    molPersonalId: { type: DataTypes.STRING(50), allowNull: true, field: 'mol_personal_id' },
    wpsEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'wps_enabled' },
    paymentMethod: {
      type: DataTypes.ENUM('BANK_TRANSFER', 'SALARY_CARD', 'CASH', 'CHEQUE'),
      allowNull: false,
      defaultValue: 'BANK_TRANSFER',
      field: 'payment_method',
    },
  },
  modelOpts('employee_bank_details')
);

const EmployeeSalaryStructure = sequelize.define(
  'EmployeeSalaryStructure',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false, field: 'effective_from' },
    effectiveTo: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_to' },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'AED' },
    status: statusActive,
  },
  modelOpts('employee_salary_structures')
);

const EmployeeSalaryLine = sequelize.define(
  'EmployeeSalaryLine',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    salaryStructureId: { type: DataTypes.INTEGER, allowNull: false, field: 'salary_structure_id' },
    payrollComponentId: { type: DataTypes.INTEGER, allowNull: true, field: 'payroll_component_id' },
    lineDescription: { type: DataTypes.STRING(200), allowNull: true, field: 'line_description' },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  },
  modelOpts('employee_salary_lines')
);

const EmployeeHistory = sequelize.define(
  'EmployeeHistory',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    eventType: {
      type: DataTypes.ENUM('SALARY_REVISION', 'PROMOTION', 'TRANSFER', 'DEPARTMENT_CHANGE', 'DESIGNATION_CHANGE', 'BRANCH_TRANSFER', 'SPONSOR_CHANGE', 'OTHER'),
      allowNull: false,
      field: 'event_type',
    },
    eventDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'event_date' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    metadataJson: { type: DataTypes.JSON, allowNull: true, field: 'metadata_json' },
    recordedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'recorded_by' },
  },
  { tableName: 'employee_history', timestamps: true, createdAt: 'created_at', updatedAt: false, underscored: true }
);

const EmployeeAssignment = sequelize.define(
  'EmployeeAssignment',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: companyIdField,
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    departmentId: { type: DataTypes.INTEGER, allowNull: true, field: 'department_id' },
    designationId: { type: DataTypes.INTEGER, allowNull: true, field: 'designation_id' },
    branchId: { type: DataTypes.INTEGER, allowNull: true, field: 'branch_id' },
    effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false, field: 'effective_from' },
    effectiveTo: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_to' },
    isPrimary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_primary' },
  },
  modelOpts('employee_assignments')
);

// Associations
Department.belongsTo(Department, { as: 'parent', foreignKey: 'parentDepartmentId' });
Department.hasMany(Department, { as: 'children', foreignKey: 'parentDepartmentId' });
Department.belongsTo(CostCenter, { foreignKey: 'costCenterId', as: 'costCenter' });

Designation.belongsTo(EmployeeGrade, { foreignKey: 'gradeId', as: 'grade' });
Designation.belongsTo(EmployeeLevel, { foreignKey: 'levelId', as: 'level' });
Designation.belongsTo(EmploymentCategory, { foreignKey: 'employmentCategoryId', as: 'employmentCategory' });

Employee.belongsTo(PayrollBranch, { foreignKey: 'branchId', as: 'branch' });
Employee.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
Employee.belongsTo(Designation, { foreignKey: 'designationId', as: 'designation' });
Employee.belongsTo(VisaSponsorCompany, { foreignKey: 'visaSponsorCompanyId', as: 'visaSponsor' });
Employee.belongsTo(WorkforceGroup, { foreignKey: 'workforceGroupId', as: 'workforceGroup' });
Employee.belongsTo(PayrollGroup, { foreignKey: 'payrollGroupId', as: 'payrollGroup' });
Employee.hasMany(EmployeeDocument, { foreignKey: 'employeeId', as: 'documents' });
EmployeeDocument.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
Employee.hasMany(EmployeeBankDetail, { foreignKey: 'employeeId', as: 'bankDetails' });
Employee.hasMany(EmployeeSalaryStructure, { foreignKey: 'employeeId', as: 'salaryStructures' });
Employee.hasMany(EmployeeHistory, { foreignKey: 'employeeId', as: 'history' });
Employee.hasMany(EmployeeAssignment, { foreignKey: 'employeeId', as: 'assignments' });

EmployeeSalaryStructure.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
EmployeeSalaryStructure.hasMany(EmployeeSalaryLine, { foreignKey: 'salaryStructureId', as: 'lines' });
EmployeeSalaryLine.belongsTo(PayrollComponent, { foreignKey: 'payrollComponentId', as: 'component' });

LeavePolicy.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', as: 'leaveType' });
LeavePolicy.hasMany(LeavePolicyRule, { foreignKey: 'leavePolicyId', as: 'rules' });
LeavePolicy.hasMany(LeavePolicyAssignment, { foreignKey: 'leavePolicyId', as: 'assignments' });
LeavePolicyAssignment.belongsTo(LeavePolicy, { foreignKey: 'leavePolicyId', as: 'leavePolicy' });
LeavePolicyAssignment.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

HolidayCalendar.hasMany(HolidayCalendarDate, { foreignKey: 'holidayCalendarId', as: 'dates' });

const p2 = require('./payrollP2Models');
p2.wireP2Associations({
  Employee,
  LeaveType,
  ShiftMaster,
  WorkCalendar,
  Department,
  CostCenter,
});

const p3 = require('./payrollP3Models');
p3.wireP3Associations({
  Employee,
  PayrollComponent,
  PayrollAttendancePeriod: p2.PayrollAttendancePeriod,
  EmployeeSalaryStructure,
});

const p4 = require('./payrollP4Models');
p4.wireP4Associations({
  Employee,
  VisaSponsorCompany,
  PayrollRun: p3.PayrollRun,
  PayrollWpsConfiguration: p4.PayrollWpsConfiguration,
});

const p5 = require('./payrollP5Models');
p5.wireP5Associations({ Employee });

const p6 = require('./payrollP6Models');
p6.wireP6Associations({ Employee });

const p7 = require('./payrollP7Models');
p7.wireP7Associations({
  Employee,
  PayrollRunEmployee: p3.PayrollRunEmployee,
  PayrollRun: p3.PayrollRun,
});

module.exports = {
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
  PayrollComponent,
  Employee,
  LeavePolicyAssignment,
  EmployeeDocument,
  EmployeeBankDetail,
  EmployeeSalaryStructure,
  EmployeeSalaryLine,
  EmployeeHistory,
  EmployeeAssignment,
  ...p2,
  ...p3,
  ...p4,
  ...p5,
  ...p6,
  ...p7,
};
