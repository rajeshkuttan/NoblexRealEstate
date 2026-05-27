const {
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
} = require('../models');
const { makeCrudHandlers } = require('../utils/payrollCrud');

const registry = {
  'visa-sponsors': { Model: VisaSponsorCompany, searchFields: ['sponsorName'], order: [['sponsorName', 'ASC']] },
  branches: { Model: PayrollBranch, searchFields: ['branchCode', 'branchName'] },
  'cost-centers': { Model: CostCenter, searchFields: ['costCenterCode', 'costCenterName'] },
  departments: {
    Model: Department,
    searchFields: ['departmentCode', 'departmentName'],
    include: [{ model: Department, as: 'parent', attributes: ['id', 'departmentName'] }],
  },
  grades: { Model: EmployeeGrade, searchFields: ['gradeCode', 'gradeName'] },
  levels: { Model: EmployeeLevel, searchFields: ['levelCode', 'levelName'] },
  'employment-categories': { Model: EmploymentCategory, searchFields: ['categoryCode', 'categoryName'] },
  designations: {
    Model: Designation,
    searchFields: ['designationCode', 'designationName'],
    include: [
      { model: EmployeeGrade, as: 'grade', attributes: ['id', 'gradeName'] },
      { model: EmployeeLevel, as: 'level', attributes: ['id', 'levelName'] },
    ],
  },
  'workforce-groups': { Model: WorkforceGroup, searchFields: ['groupCode', 'groupName'] },
  'payroll-groups': { Model: PayrollGroup, searchFields: ['groupCode', 'groupName'] },
  'work-locations': { Model: WorkLocation, searchFields: ['locationCode', 'locationName'] },
};

function resolveEntity(req) {
  const key = req.params.entity;
  const cfg = registry[key];
  if (!cfg) {
    const err = new Error(`Unknown organization entity: ${key}`);
    err.statusCode = 404;
    throw err;
  }
  return cfg;
}

exports.list = async (req, res, next) => {
  try {
    const cfg = resolveEntity(req);
    return makeCrudHandlers(cfg.Model, cfg).list(req, res, next);
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const cfg = resolveEntity(req);
    return makeCrudHandlers(cfg.Model, cfg).getById(req, res, next);
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const cfg = resolveEntity(req);
    return makeCrudHandlers(cfg.Model, cfg).create(req, res, next);
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const cfg = resolveEntity(req);
    return makeCrudHandlers(cfg.Model, cfg).update(req, res, next);
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const cfg = resolveEntity(req);
    return makeCrudHandlers(cfg.Model, cfg).remove(req, res, next);
  } catch (e) {
    next(e);
  }
};

exports.listEntities = (req, res) => {
  res.json({ success: true, data: Object.keys(registry) });
};
