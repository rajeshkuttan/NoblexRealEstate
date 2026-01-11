const express = require('express');
const router = express.Router();
const systemSettingController = require('../controllers/systemSettingController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// System Setting routes
router.get('/', systemSettingController.getAllSettings);
router.get('/categories', systemSettingController.getCategories);
router.get('/category/:category', systemSettingController.getSettingsByCategory);
router.get('/key/:key', systemSettingController.getSettingByKey);
router.post('/', systemSettingController.createSetting);
router.post('/bulk-update', systemSettingController.bulkUpdateSettings);
router.put('/key/:key', systemSettingController.updateSetting);
router.delete('/key/:key', systemSettingController.deleteSetting);

module.exports = router;
