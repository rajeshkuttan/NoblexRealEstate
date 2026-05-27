const { PayrollComponent } = require('../models');
const { makeCrudHandlers } = require('../utils/payrollCrud');

const crud = makeCrudHandlers(PayrollComponent, {
  searchFields: ['componentCode', 'componentName'],
  order: [['componentCode', 'ASC']],
});

exports.list = crud.list;
exports.getById = crud.getById;
exports.create = crud.create;
exports.update = crud.update;
exports.remove = crud.remove;
