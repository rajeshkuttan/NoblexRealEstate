const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/config');
const { getUserEffectivePermissions } = require('../services/rbacService');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access token required' 
      });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findByPk(decoded.id);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or inactive user' 
      });
    }

    const { roles, permissions } = await getUserEffectivePermissions(user);
    req.user = user;
    req.userRoles = roles;
    req.userPermissions = permissions;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication error' 
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

const requirePermission = (permissionCode) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const permissionCodes = Array.isArray(req.userPermissions) ? req.userPermissions : [];
    if (!permissionCodes.includes(permissionCode)) {
      return res.status(403).json({
        success: false,
        message: `Permission denied: ${permissionCode}`
      });
    }
    next();
  };
};

const requireAnyPermission = (permissionCodes = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!Array.isArray(permissionCodes) || permissionCodes.length === 0) {
      return next();
    }

    const currentPermissions = Array.isArray(req.userPermissions) ? req.userPermissions : [];
    const hasPermission = permissionCodes.some((permission) => currentPermissions.includes(permission));
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    next();
  };
};

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

module.exports = {
  authenticateToken,
  authorize,
  requirePermission,
  requireAnyPermission,
  generateToken
};
