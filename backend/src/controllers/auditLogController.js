const { AuditLog, User } = require('../models');
const { Op } = require('sequelize');

exports.getAuditLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId = '',
      username = '',
      from = '',
      to = '',
      entityType = '',
      action = ''
    } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (action) where.action = { [Op.like]: `%${action}%` };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to) where.createdAt[Op.lte] = new Date(to);
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

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
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
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset
    });

    res.json({
      success: true,
      data: {
        logs: rows,
        pagination: {
          total: count,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          pages: Math.ceil(count / parseInt(limit, 10))
        }
      }
    });
  } catch (e) {
    next(e);
  }
};
