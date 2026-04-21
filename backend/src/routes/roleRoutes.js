const express = require('express');
const router = express.Router();
const {
  listRoles,
  listPermissions,
  createRole,
  updateRole,
  deleteRole,
} = require('../controllers/roleController');
const { authenticateToken, requirePermission } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', requirePermission('module:roles_permissions:view'), listRoles);
router.get('/permissions', requirePermission('module:roles_permissions:view'), listPermissions);
router.post('/', requirePermission('module:roles_permissions:create'), createRole);
router.put('/:id', requirePermission('module:roles_permissions:update'), updateRole);
router.delete('/:id', requirePermission('module:roles_permissions:delete'), deleteRole);

module.exports = router;
