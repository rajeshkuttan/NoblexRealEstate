'use strict';

const companyFk = {
  type: require('sequelize').INTEGER,
  allowNull: false,
  references: { model: 'company_settings', key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'RESTRICT',
};

const timestamps = {
  created_at: { type: require('sequelize').DATE, allowNull: false, defaultValue: require('sequelize').literal('CURRENT_TIMESTAMP') },
  updated_at: {
    type: require('sequelize').DATE,
    allowNull: false,
    defaultValue: require('sequelize').literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
  },
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const ts = timestamps;
    const cfk = companyFk;

    await queryInterface.createTable('visa_sponsor_companies', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      sponsor_name: { type: Sequelize.STRING(200), allowNull: false },
      trade_license: { type: Sequelize.STRING(100), allowNull: true },
      labour_establishment_no: { type: Sequelize.STRING(100), allowNull: true },
      mol_number: { type: Sequelize.STRING(100), allowNull: true },
      immigration_file_no: { type: Sequelize.STRING(100), allowNull: true },
      wps_company_code: { type: Sequelize.STRING(50), allowNull: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      contact_person: { type: Sequelize.STRING(100), allowNull: true },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      email: { type: Sequelize.STRING(100), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...ts,
    });

    await queryInterface.createTable('payroll_branches', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      branch_code: { type: Sequelize.STRING(50), allowNull: false },
      branch_name: { type: Sequelize.STRING(200), allowNull: false },
      status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      ...ts,
    });

    await queryInterface.createTable('cost_centers', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      cost_center_code: { type: Sequelize.STRING(50), allowNull: false },
      cost_center_name: { type: Sequelize.STRING(200), allowNull: false },
      status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      ...ts,
    });

    await queryInterface.createTable('departments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      department_code: { type: Sequelize.STRING(50), allowNull: false },
      department_name: { type: Sequelize.STRING(200), allowNull: false },
      parent_department_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'departments', key: 'id' } },
      manager_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
      cost_center_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'cost_centers', key: 'id' } },
      status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      ...ts,
    });

    await queryInterface.createTable('employee_grades', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      grade_code: { type: Sequelize.STRING(50), allowNull: false },
      grade_name: { type: Sequelize.STRING(100), allowNull: false },
      status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      ...ts,
    });

    await queryInterface.createTable('employee_levels', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      level_code: { type: Sequelize.STRING(50), allowNull: false },
      level_name: { type: Sequelize.STRING(100), allowNull: false },
      status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      ...ts,
    });

    await queryInterface.createTable('employment_categories', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      category_code: { type: Sequelize.STRING(50), allowNull: false },
      category_name: { type: Sequelize.STRING(100), allowNull: false },
      status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      ...ts,
    });

    await queryInterface.createTable('designations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      designation_code: { type: Sequelize.STRING(50), allowNull: false },
      designation_name: { type: Sequelize.STRING(200), allowNull: false },
      grade_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'employee_grades', key: 'id' } },
      level_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'employee_levels', key: 'id' } },
      employment_category_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'employment_categories', key: 'id' } },
      status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      ...ts,
    });

    await queryInterface.createTable('workforce_groups', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      group_code: { type: Sequelize.STRING(50), allowNull: false },
      group_name: { type: Sequelize.STRING(100), allowNull: false },
      status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      ...ts,
    });

    await queryInterface.createTable('payroll_groups', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      group_code: { type: Sequelize.STRING(50), allowNull: false },
      group_name: { type: Sequelize.STRING(100), allowNull: false },
      status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      ...ts,
    });

    await queryInterface.createTable('work_locations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      location_code: { type: Sequelize.STRING(50), allowNull: false },
      location_name: { type: Sequelize.STRING(200), allowNull: false },
      address: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      ...ts,
    });

    await queryInterface.createTable('shift_masters', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      shift_code: { type: Sequelize.STRING(50), allowNull: false },
      shift_name: { type: Sequelize.STRING(100), allowNull: false },
      start_time: { type: Sequelize.STRING(10), allowNull: true },
      end_time: { type: Sequelize.STRING(10), allowNull: true },
      break_minutes: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
      work_days: { type: Sequelize.STRING(50), allowNull: true },
      overtime_eligible: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      ...ts,
    });

    await queryInterface.createTable('holiday_calendars', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      calendar_code: { type: Sequelize.STRING(50), allowNull: false },
      calendar_name: { type: Sequelize.STRING(200), allowNull: false },
      year: { type: Sequelize.INTEGER, allowNull: true },
      status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      ...ts,
    });

    await queryInterface.createTable('holiday_calendar_dates', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      holiday_calendar_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'holiday_calendars', key: 'id' }, onDelete: 'CASCADE' },
      holiday_date: { type: Sequelize.DATEONLY, allowNull: false },
      description: { type: Sequelize.STRING(200), allowNull: true },
      ...ts,
    });

    await queryInterface.createTable('work_calendars', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      calendar_code: { type: Sequelize.STRING(50), allowNull: false },
      calendar_name: { type: Sequelize.STRING(200), allowNull: false },
      work_days: { type: Sequelize.STRING(50), allowNull: true },
      status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      ...ts,
    });

    await queryInterface.createTable('leave_types', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      leave_code: { type: Sequelize.STRING(50), allowNull: false },
      leave_name: { type: Sequelize.STRING(100), allowNull: false },
      is_paid: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      ...ts,
    });

    await queryInterface.createTable('leave_policies', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      policy_code: { type: Sequelize.STRING(50), allowNull: false },
      policy_name: { type: Sequelize.STRING(200), allowNull: false },
      leave_type_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'leave_types', key: 'id' } },
      status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      ...ts,
    });

    await queryInterface.createTable('leave_policy_rules', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      leave_policy_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'leave_policies', key: 'id' }, onDelete: 'CASCADE' },
      carry_forward_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      carry_forward_max_days: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      encashment_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      probation_restricted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      eligibility_days: { type: Sequelize.INTEGER, allowNull: true },
      annual_entitlement_days: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      ...ts,
    });

    await queryInterface.createTable('payroll_components', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      component_code: { type: Sequelize.STRING(50), allowNull: false },
      component_name: { type: Sequelize.STRING(200), allowNull: false },
      component_type: { type: Sequelize.ENUM('EARNING', 'DEDUCTION', 'EMPLOYER', 'PROVISION'), allowNull: false },
      taxable: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      recurring: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      affects_eos: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      affects_wps: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      ...ts,
    });

    await queryInterface.createTable('employees', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      employee_no: { type: Sequelize.STRING(50), allowNull: false },
      employee_name: { type: Sequelize.STRING(200), allowNull: false },
      arabic_name: { type: Sequelize.STRING(200), allowNull: true },
      branch_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'payroll_branches', key: 'id' } },
      department_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'departments', key: 'id' } },
      designation_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'designations', key: 'id' } },
      grade_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'employee_grades', key: 'id' } },
      level_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'employee_levels', key: 'id' } },
      workforce_group_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'workforce_groups', key: 'id' } },
      employment_category_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'employment_categories', key: 'id' } },
      payroll_group_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'payroll_groups', key: 'id' } },
      visa_sponsor_company_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'visa_sponsor_companies', key: 'id' } },
      work_location_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'work_locations', key: 'id' } },
      nationality: { type: Sequelize.STRING(100), allowNull: true },
      gender: { type: Sequelize.ENUM('male', 'female', 'other'), allowNull: true },
      joining_date: { type: Sequelize.DATEONLY, allowNull: true },
      probation_end_date: { type: Sequelize.DATEONLY, allowNull: true },
      status: { type: Sequelize.ENUM('active', 'inactive', 'terminated'), allowNull: false, defaultValue: 'active' },
      created_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
      ...ts,
    });

    await queryInterface.createTable('leave_policy_assignments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      leave_policy_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'leave_policies', key: 'id' } },
      employee_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' } },
      effective_from: { type: Sequelize.DATEONLY, allowNull: true },
      effective_to: { type: Sequelize.DATEONLY, allowNull: true },
      ...ts,
    });

    await queryInterface.createTable('employee_documents', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      employee_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' }, onDelete: 'CASCADE' },
      document_type: {
        type: Sequelize.ENUM('passport', 'visa', 'emirates_id', 'labour_card', 'medical_insurance', 'driving_license', 'contract', 'other'),
        allowNull: false,
      },
      document_number: { type: Sequelize.STRING(100), allowNull: true },
      issue_date: { type: Sequelize.DATEONLY, allowNull: true },
      expiry_date: { type: Sequelize.DATEONLY, allowNull: true },
      attachment_path: { type: Sequelize.STRING(500), allowNull: true },
      alert_days_before: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 30 },
      ...ts,
    });

    await queryInterface.createTable('employee_bank_details', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      employee_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' }, onDelete: 'CASCADE' },
      bank_name: { type: Sequelize.STRING(200), allowNull: true },
      account_number: { type: Sequelize.STRING(50), allowNull: true },
      iban: { type: Sequelize.STRING(50), allowNull: true },
      swift_code: { type: Sequelize.STRING(20), allowNull: true },
      is_primary: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...ts,
    });

    await queryInterface.createTable('employee_salary_structures', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      employee_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' }, onDelete: 'CASCADE' },
      effective_from: { type: Sequelize.DATEONLY, allowNull: false },
      effective_to: { type: Sequelize.DATEONLY, allowNull: true },
      currency: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'AED' },
      status: { type: Sequelize.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      ...ts,
    });

    await queryInterface.createTable('employee_salary_lines', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      salary_structure_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'employee_salary_structures', key: 'id' }, onDelete: 'CASCADE' },
      payroll_component_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'payroll_components', key: 'id' } },
      line_description: { type: Sequelize.STRING(200), allowNull: true },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      ...ts,
    });

    await queryInterface.createTable('employee_history', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      employee_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' }, onDelete: 'CASCADE' },
      event_type: {
        type: Sequelize.ENUM('SALARY_REVISION', 'PROMOTION', 'TRANSFER', 'DEPARTMENT_CHANGE', 'DESIGNATION_CHANGE', 'BRANCH_TRANSFER', 'SPONSOR_CHANGE', 'OTHER'),
        allowNull: false,
      },
      event_date: { type: Sequelize.DATEONLY, allowNull: false },
      notes: { type: Sequelize.TEXT, allowNull: true },
      metadata_json: { type: Sequelize.JSON, allowNull: true },
      recorded_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('employee_assignments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      employee_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' }, onDelete: 'CASCADE' },
      department_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'departments', key: 'id' } },
      designation_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'designations', key: 'id' } },
      branch_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'payroll_branches', key: 'id' } },
      effective_from: { type: Sequelize.DATEONLY, allowNull: false },
      effective_to: { type: Sequelize.DATEONLY, allowNull: true },
      is_primary: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ...ts,
    });

    const uniques = [
      ['visa_sponsor_companies', 'visa_sponsor_company_unique', ['company_id', 'sponsor_name']],
      ['payroll_branches', 'payroll_branch_code_unique', ['company_id', 'branch_code']],
      ['cost_centers', 'cost_center_code_unique', ['company_id', 'cost_center_code']],
      ['departments', 'department_code_unique', ['company_id', 'department_code']],
      ['employee_grades', 'employee_grade_code_unique', ['company_id', 'grade_code']],
      ['employee_levels', 'employee_level_code_unique', ['company_id', 'level_code']],
      ['employment_categories', 'employment_category_code_unique', ['company_id', 'category_code']],
      ['designations', 'designation_code_unique', ['company_id', 'designation_code']],
      ['workforce_groups', 'workforce_group_code_unique', ['company_id', 'group_code']],
      ['payroll_groups', 'payroll_group_code_unique', ['company_id', 'group_code']],
      ['work_locations', 'work_location_code_unique', ['company_id', 'location_code']],
      ['shift_masters', 'shift_master_code_unique', ['company_id', 'shift_code']],
      ['holiday_calendars', 'holiday_calendar_code_unique', ['company_id', 'calendar_code']],
      ['work_calendars', 'work_calendar_code_unique', ['company_id', 'calendar_code']],
      ['leave_types', 'leave_type_code_unique', ['company_id', 'leave_code']],
      ['leave_policies', 'leave_policy_code_unique', ['company_id', 'policy_code']],
      ['payroll_components', 'payroll_component_code_unique', ['company_id', 'component_code']],
      ['employees', 'employee_no_unique', ['company_id', 'employee_no']],
    ];
    for (const [table, name, cols] of uniques) {
      await queryInterface.addIndex(table, cols, { unique: true, name }).catch(() => {});
    }
  },

  down: async (queryInterface) => {
    const tables = [
      'employee_assignments',
      'employee_history',
      'employee_salary_lines',
      'employee_salary_structures',
      'employee_bank_details',
      'employee_documents',
      'leave_policy_assignments',
      'employees',
      'payroll_components',
      'leave_policy_rules',
      'leave_policies',
      'leave_types',
      'work_calendars',
      'holiday_calendar_dates',
      'holiday_calendars',
      'shift_masters',
      'work_locations',
      'payroll_groups',
      'workforce_groups',
      'designations',
      'employment_categories',
      'employee_levels',
      'employee_grades',
      'departments',
      'cost_centers',
      'payroll_branches',
      'visa_sponsor_companies',
    ];
    for (const t of tables) {
      await queryInterface.dropTable(t).catch(() => {});
    }
  },
};
