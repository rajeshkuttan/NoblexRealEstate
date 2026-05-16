const { AuditLog, User } = require('../models');
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');

function buildDateBoundary(value, endOfDay = false) {
  if (!value) return null;
  const suffix = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000';
  const date = new Date(`${value}${suffix}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

exports.getAuditLogs = async (req, res, next) => {
  try {
    const {
      userId = '',
      username = '',
      from = '',
      to = '',
      entityType = '',
      action = ''
    } = req.query;
    const { page, limit, offset } = normalizePagination(req.query, 50, 200);

    const where = {};
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (action) where.action = { [Op.like]: `%${action}%` };
    if (from || to) {
      where.createdAt = {};
      const fromDate = buildDateBoundary(from, false);
      const toDate = buildDateBoundary(to, true);
      if (fromDate) where.createdAt[Op.gte] = fromDate;
      if (toDate) where.createdAt[Op.lte] = toDate;
    }

    const userIncludeWhere =
      !userId && username && String(username).trim()
        ? {
            [Op.or]: [
              { name: { [Op.like]: `%${username.trim()}%` } },
              { email: { [Op.like]: `%${username.trim()}%` } }
            ]
          }
        : undefined;

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
          required: !!userIncludeWhere,
          where: userIncludeWhere
        }
      ],
      order: [['created_at', 'DESC']],
      distinct: true,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

    res.json({
      success: true,
      data: {
        logs: rows,
        pagination: createPaginationMeta(count, page, limit)
      }
    });
  } catch (e) {
    next(e);
  }
};
