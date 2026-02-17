const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken: protect, authorize } = require('../middleware/auth');

// All routes are protected and require admin or manager privileges for most operations
router.use(protect);

router.get('/', authorize('admin', 'manager'), userController.getAllUsers);
router.post('/', authorize('admin'), userController.createUser);
router.get('/:id', authorize('admin', 'manager'), userController.getUserById);
router.put('/:id', authorize('admin'), userController.updateUser);
router.delete('/:id', authorize('admin'), userController.deleteUser);

module.exports = router;
