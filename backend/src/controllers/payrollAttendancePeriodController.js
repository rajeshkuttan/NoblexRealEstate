const { PayrollAttendancePeriod } = require('../models');
const { companyWhere, withCompanyId, stripCompanyFromBody, assertRecordInCompany } = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');
const { monthBounds } = require('../services/payroll/payrollMonthlySummaryService');
const { lockSummariesForPeriod } = require('../services/payroll/payrollDailySummaryService');
const {
  AttendancePeriodLockedError,
  LOCKED_MESSAGE,
} = require('../services/payroll/payrollAttendancePeriodGuard');

exports.list = async (req, res, next) => {
  try {
    const rows = await PayrollAttendancePeriod.findAll({
      where: companyWhere(req),
      order: [['periodYear', 'DESC'], ['periodMonth', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.generate = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    const month = Number(body.period_month || body.month);
    const year = Number(body.period_year || body.year);
    const { fromDate, toDate } = monthBounds(year, month);

    const existing = await PayrollAttendancePeriod.findOne({
      where: { companyId: req.companyId, periodMonth: month, periodYear: year },
    });
    if (existing && existing.status === 'LOCKED') {
      return res.status(403).json({ message: LOCKED_MESSAGE });
    }

    let period;
    if (existing) {
      await existing.update({
        fromDate,
        toDate,
        status: 'GENERATED',
        generatedBy: req.user?.id,
        generatedAt: new Date(),
      });
      period = existing;
    } else {
      period = await PayrollAttendancePeriod.create(
        withCompanyId(req, {
          periodMonth: month,
          periodYear: year,
          fromDate,
          toDate,
          status: 'GENERATED',
          generatedBy: req.user?.id,
          generatedAt: new Date(),
        })
      );
    }
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.ATTENDANCE_PERIOD_GENERATED,
      entityId: req.companyId,
      metadata: { period_id: period.id, month, year },
    });
    res.json({ success: true, data: period });
  } catch (e) {
    next(e);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const period = await assertRecordInCompany(PayrollAttendancePeriod, req.params.id, req);
    if (period.status === 'LOCKED') {
      return res.status(403).json({ message: LOCKED_MESSAGE });
    }
    await period.update({
      status: 'APPROVED',
      approvedBy: req.user?.id,
      approvedAt: new Date(),
    });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.ATTENDANCE_PERIOD_APPROVED,
      entityId: req.companyId,
      metadata: { period_id: period.id },
    });
    res.json({ success: true, data: period });
  } catch (e) {
    next(e);
  }
};

exports.lock = async (req, res, next) => {
  try {
    const period = await assertRecordInCompany(PayrollAttendancePeriod, req.params.id, req);
    if (period.status === 'LOCKED') {
      return res.status(403).json({ message: LOCKED_MESSAGE });
    }
    if (!['APPROVED', 'GENERATED', 'UNDER_REVIEW'].includes(period.status)) {
      return res.status(400).json({ message: 'Period must be generated before lock' });
    }
    await lockSummariesForPeriod(req.companyId, period.fromDate, period.toDate);
    await period.update({
      status: 'LOCKED',
      lockedBy: req.user?.id,
      lockedAt: new Date(),
    });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.ATTENDANCE_PERIOD_LOCKED,
      entityId: req.companyId,
      metadata: { period_id: period.id },
    });
    res.json({ success: true, data: period });
  } catch (e) {
    next(e);
  }
};
