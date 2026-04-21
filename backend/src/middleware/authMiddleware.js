const {
  authenticateToken,
  authorize,
  requirePermission,
  requireAnyPermission,
} = require('./auth');

module.exports = {
  authMiddleware: authenticateToken,
  authorize,
  requirePermission,
  requireAnyPermission,
};
