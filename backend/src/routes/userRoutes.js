const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken: protect, requireAnyPermission, requirePermission } = require('../middleware/auth');

// All routes are protected and require admin or manager privileges for most operations
router.use(protect);

router.get('/', requireAnyPermission(['module:users:view', 'module:settings:view']), userController.getAllUsers);
router.post('/', requirePermission('module:users:create'), userController.createUser);
router.get('/:id', requirePermission('module:users:view'), userController.getUserById);
router.put('/:id', requirePermission('module:users:update'), userController.updateUser);
router.delete('/:id', requirePermission('module:users:delete'), userController.deleteUser);

module.exports = router;
