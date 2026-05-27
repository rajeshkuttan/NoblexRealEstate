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

async function tableExists(queryInterface, name) {
  const tables = await queryInterface.showAllTables();
  const list = Array.isArray(tables) ? tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.TABLE_NAME)) : [];
  return list.includes(name);
}

async function addColumnIfMissing(queryInterface, table, column, definition) {
  const desc = await queryInterface.describeTable(table);
  if (!desc[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const ts = timestamps;
    const cfk = companyFk;

    await addColumnIfMissing(queryInterface, 'leave_types', 'allow_negative_balance', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    if (!(await tableExists(queryInterface, 'payroll_leave_opening_balances'))) {
      await queryInterface.createTable('payroll_leave_opening_balances', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        employee_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' } },
        leave_type_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'leave_types', key: 'id' } },
        balance_year: { type: Sequelize.INTEGER, allowNull: false },
        opening_days: { type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
        used_days: { type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
        adjusted_days: { type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
        available_days: { type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
        status: { type: Sequelize.ENUM('DRAFT', 'APPROVED', 'LOCKED'), allowNull: false, defaultValue: 'DRAFT' },
        created_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
        approved_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
        approved_at: { type: Sequelize.DATE, allowNull: true },
        ...ts,
      });
      await queryInterface.addIndex('payroll_leave_opening_balances', ['company_id', 'employee_id', 'leave_type_id', 'balance_year'], {
        unique: true,
        name: 'uq_payroll_leave_opening_bal',
      });
    }

    if (!(await tableExists(queryInterface, 'payroll_leave_applications'))) {
      await queryInterface.createTable('payroll_leave_applications', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        employee_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' } },
        leave_type_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'leave_types', key: 'id' } },
        from_date: { type: Sequelize.DATEONLY, allowNull: false },
        to_date: { type: Sequelize.DATEONLY, allowNull: false },
        total_days: { type: Sequelize.DECIMAL(8, 2), allowNull: false },
        half_day: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        reason: { type: Sequelize.TEXT, allowNull: true },
        status: {
          type: Sequelize.ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'),
          allowNull: false,
          defaultValue: 'DRAFT',
        },
        approval_level: { type: Sequelize.INTEGER, allowNull: true },
        approved_by: { type: Sequelize.INTEGER, allowNull: true },
        approved_at: { type: Sequelize.DATE, allowNull: true },
        rejected_by: { type: Sequelize.INTEGER, allowNull: true },
        rejected_at: { type: Sequelize.DATE, allowNull: true },
        rejection_reason: { type: Sequelize.TEXT, allowNull: true },
        cancelled_by: { type: Sequelize.INTEGER, allowNull: true },
        cancelled_at: { type: Sequelize.DATE, allowNull: true },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        ...ts,
      });
      await queryInterface.addIndex('payroll_leave_applications', ['company_id', 'employee_id', 'from_date', 'to_date']);
    }

    if (!(await tableExists(queryInterface, 'payroll_attendance_logs'))) {
      await queryInterface.createTable('payroll_attendance_logs', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        employee_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' } },
        attendance_date: { type: Sequelize.DATEONLY, allowNull: false },
        check_in_time: { type: Sequelize.STRING(20), allowNull: true },
        check_out_time: { type: Sequelize.STRING(20), allowNull: true },
        source: { type: Sequelize.ENUM('MANUAL', 'IMPORT', 'BIOMETRIC', 'SYSTEM'), allowNull: false, defaultValue: 'MANUAL' },
        device_id: { type: Sequelize.STRING(100), allowNull: true },
        location: { type: Sequelize.STRING(200), allowNull: true },
        raw_payload: { type: Sequelize.JSON, allowNull: true },
        status: { type: Sequelize.ENUM('RAW', 'VALIDATED', 'ERROR', 'IGNORED'), allowNull: false, defaultValue: 'RAW' },
        ...ts,
      });
      await queryInterface.addIndex('payroll_attendance_logs', ['company_id', 'employee_id', 'attendance_date']);
    }

    if (!(await tableExists(queryInterface, 'payroll_attendance_daily_summaries'))) {
      await queryInterface.createTable('payroll_attendance_daily_summaries', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        employee_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' } },
        attendance_date: { type: Sequelize.DATEONLY, allowNull: false },
        shift_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'shift_masters', key: 'id' } },
        work_calendar_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'work_calendars', key: 'id' } },
        scheduled_hours: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
        actual_hours: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
        late_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        early_leave_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        overtime_hours: { type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
        absence_type: { type: Sequelize.STRING(50), allowNull: true },
        attendance_status: {
          type: Sequelize.ENUM(
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
        },
        source: { type: Sequelize.STRING(50), allowNull: true },
        is_manual_adjustment: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        approved_by: { type: Sequelize.INTEGER, allowNull: true },
        approved_at: { type: Sequelize.DATE, allowNull: true },
        locked: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        ...ts,
      });
      await queryInterface.addIndex(
        'payroll_attendance_daily_summaries',
        ['company_id', 'employee_id', 'attendance_date'],
        { unique: true, name: 'uq_payroll_daily_attendance' }
      );
    }

    if (!(await tableExists(queryInterface, 'payroll_labour_timesheets'))) {
      await queryInterface.createTable('payroll_labour_timesheets', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        timesheet_month: { type: Sequelize.INTEGER, allowNull: false },
        timesheet_year: { type: Sequelize.INTEGER, allowNull: false },
        department_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'departments', key: 'id' } },
        cost_center_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'cost_centers', key: 'id' } },
        status: {
          type: Sequelize.ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED', 'REJECTED'),
          allowNull: false,
          defaultValue: 'DRAFT',
        },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        approved_by: { type: Sequelize.INTEGER, allowNull: true },
        approved_at: { type: Sequelize.DATE, allowNull: true },
        locked_at: { type: Sequelize.DATE, allowNull: true },
        ...ts,
      });
      await queryInterface.addIndex('payroll_labour_timesheets', ['company_id', 'timesheet_year', 'timesheet_month']);
    }

    if (!(await tableExists(queryInterface, 'payroll_labour_timesheet_lines'))) {
      await queryInterface.createTable('payroll_labour_timesheet_lines', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        timesheet_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'payroll_labour_timesheets', key: 'id' },
          onDelete: 'CASCADE',
        },
        company_id: cfk,
        employee_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' } },
        work_date: { type: Sequelize.DATEONLY, allowNull: false },
        normal_hours: { type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
        overtime_hours: { type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
        holiday_hours: { type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
        absence_hours: { type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        ...ts,
      });
      await queryInterface.addIndex('payroll_labour_timesheet_lines', ['timesheet_id', 'employee_id', 'work_date'], {
        unique: true,
        name: 'uq_labour_ts_line',
      });
    }

    if (!(await tableExists(queryInterface, 'payroll_overtime_requests'))) {
      await queryInterface.createTable('payroll_overtime_requests', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        employee_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'employees', key: 'id' } },
        work_date: { type: Sequelize.DATEONLY, allowNull: false },
        requested_hours: { type: Sequelize.DECIMAL(8, 2), allowNull: false },
        approved_hours: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
        reason: { type: Sequelize.TEXT, allowNull: true },
        status: {
          type: Sequelize.ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'),
          allowNull: false,
          defaultValue: 'DRAFT',
        },
        approved_by: { type: Sequelize.INTEGER, allowNull: true },
        approved_at: { type: Sequelize.DATE, allowNull: true },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        ...ts,
      });
      await queryInterface.addIndex('payroll_overtime_requests', ['company_id', 'employee_id', 'work_date']);
    }

    if (!(await tableExists(queryInterface, 'payroll_attendance_periods'))) {
      await queryInterface.createTable('payroll_attendance_periods', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        period_month: { type: Sequelize.INTEGER, allowNull: false },
        period_year: { type: Sequelize.INTEGER, allowNull: false },
        from_date: { type: Sequelize.DATEONLY, allowNull: false },
        to_date: { type: Sequelize.DATEONLY, allowNull: false },
        status: {
          type: Sequelize.ENUM('OPEN', 'GENERATED', 'UNDER_REVIEW', 'APPROVED', 'LOCKED'),
          allowNull: false,
          defaultValue: 'OPEN',
        },
        generated_by: { type: Sequelize.INTEGER, allowNull: true },
        generated_at: { type: Sequelize.DATE, allowNull: true },
        approved_by: { type: Sequelize.INTEGER, allowNull: true },
        approved_at: { type: Sequelize.DATE, allowNull: true },
        locked_by: { type: Sequelize.INTEGER, allowNull: true },
        locked_at: { type: Sequelize.DATE, allowNull: true },
        ...ts,
      });
      await queryInterface.addIndex('payroll_attendance_periods', ['company_id', 'period_year', 'period_month'], {
        unique: true,
        name: 'uq_payroll_attendance_period',
      });
    }
  },

  down: async (queryInterface) => {
    const tables = [
      'payroll_attendance_periods',
      'payroll_overtime_requests',
      'payroll_labour_timesheet_lines',
      'payroll_labour_timesheets',
      'payroll_attendance_daily_summaries',
      'payroll_attendance_logs',
      'payroll_leave_applications',
      'payroll_leave_opening_balances',
    ];
    for (const t of tables) {
      if (await tableExists(queryInterface, t)) {
        await queryInterface.dropTable(t);
      }
    }
    try {
      await queryInterface.removeColumn('leave_types', 'allow_negative_balance');
    } catch (_) {
      /* ignore */
    }
  },
};
