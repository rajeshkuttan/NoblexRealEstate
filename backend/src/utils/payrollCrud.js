const { Op } = require('sequelize');
const { companyWhere, withCompanyId, stripCompanyFromBody, assertRecordInCompany } = require('./companyScope');

function makeCrudHandlers(Model, options = {}) {
  const searchFields = options.searchFields || [];
  const defaultOrder = options.order || [['id', 'DESC']];
  const include = options.include || [];

  return {
    list: async (req, res, next) => {
      try {
        const { page = 1, limit = 50, search = '', status } = req.query;
        const where = { ...companyWhere(req) };
        if (status) where.status = status;
        if (search && searchFields.length) {
          where[Op.or] = searchFields.map((f) => ({ [f]: { [Op.like]: `%${search}%` } }));
        }
        const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
        const { count, rows } = await Model.findAndCountAll({
          where,
          include,
          order: defaultOrder,
          limit: parseInt(limit, 10),
          offset,
        });
        res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page, 10), limit: parseInt(limit, 10) } });
      } catch (e) {
        next(e);
      }
    },
    getById: async (req, res, next) => {
      try {
        const row = await assertRecordInCompany(Model, req.params.id, req, { include });
        res.json({ success: true, data: row });
      } catch (e) {
        next(e);
      }
    },
    create: async (req, res, next) => {
      try {
        const body = stripCompanyFromBody(req.body);
        const row = await Model.create(withCompanyId(req, body));
        res.status(201).json({ success: true, data: row });
      } catch (e) {
        next(e);
      }
    },
    update: async (req, res, next) => {
      try {
        const row = await assertRecordInCompany(Model, req.params.id, req);
        const body = stripCompanyFromBody(req.body);
        await row.update(body);
        res.json({ success: true, data: row });
      } catch (e) {
        next(e);
      }
    },
    remove: async (req, res, next) => {
      try {
        const row = await assertRecordInCompany(Model, req.params.id, req);
        await row.destroy();
        res.json({ success: true, message: 'Deleted' });
      } catch (e) {
        next(e);
      }
    },
  };
}

module.exports = { makeCrudHandlers };
