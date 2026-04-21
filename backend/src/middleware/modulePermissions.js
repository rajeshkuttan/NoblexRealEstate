const { authenticateToken, requirePermission } = require('./auth');

const methodToAction = {
  GET: 'view',
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

const requireModulePermission = (moduleKey) => {
  return (req, res, next) => {
    const action = methodToAction[req.method] || 'view';
    const permissionCode = `module:${moduleKey}:${action}`;
    return authenticateToken(req, res, () => requirePermission(permissionCode)(req, res, next));
  };
};

module.exports = {
  requireModulePermission,
};
