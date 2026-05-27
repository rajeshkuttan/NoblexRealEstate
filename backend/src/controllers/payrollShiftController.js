const { ShiftMaster, HolidayCalendar, HolidayCalendarDate, WorkCalendar } = require('../models');
const { makeCrudHandlers } = require('../utils/payrollCrud');
const { companyWhere, withCompanyId, stripCompanyFromBody, assertRecordInCompany } = require('../utils/companyScope');

const shiftCrud = makeCrudHandlers(ShiftMaster, { searchFields: ['shiftCode', 'shiftName'] });
const holidayCrud = makeCrudHandlers(HolidayCalendar, {
  searchFields: ['calendarCode', 'calendarName'],
  include: [{ model: HolidayCalendarDate, as: 'dates' }],
});
const workCalendarCrud = makeCrudHandlers(WorkCalendar, { searchFields: ['calendarCode', 'calendarName'] });

exports.listShifts = shiftCrud.list;
exports.getShift = shiftCrud.getById;
exports.createShift = shiftCrud.create;
exports.updateShift = shiftCrud.update;
exports.removeShift = shiftCrud.remove;

exports.listHolidayCalendars = holidayCrud.list;
exports.getHolidayCalendar = holidayCrud.getById;
exports.createHolidayCalendar = holidayCrud.create;
exports.updateHolidayCalendar = holidayCrud.update;
exports.removeHolidayCalendar = holidayCrud.remove;

exports.listWorkCalendars = workCalendarCrud.list;
exports.getWorkCalendar = workCalendarCrud.getById;
exports.createWorkCalendar = workCalendarCrud.create;
exports.updateWorkCalendar = workCalendarCrud.update;
exports.removeWorkCalendar = workCalendarCrud.remove;

exports.addHolidayDate = async (req, res, next) => {
  try {
    await assertRecordInCompany(HolidayCalendar, req.params.id, req);
    const body = stripCompanyFromBody(req.body);
    const row = await HolidayCalendarDate.create(
      withCompanyId(req, { ...body, holidayCalendarId: parseInt(req.params.id, 10) })
    );
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.listHolidayDates = async (req, res, next) => {
  try {
    await assertRecordInCompany(HolidayCalendar, req.params.id, req);
    const rows = await HolidayCalendarDate.findAll({
      where: { holidayCalendarId: req.params.id, ...companyWhere(req) },
      order: [['holidayDate', 'ASC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};
