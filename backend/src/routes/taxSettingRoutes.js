const express = require('express');
const router = express.Router();
const taxSettingController = require('../controllers/taxSettingController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Tax Setting routes
router.get('/', taxSettingController.getAllTaxSettings);
router.get('/active', taxSettingController.getActiveTaxSettings);
router.get('/default', taxSettingController.getDefaultTaxSetting);
router.get('/current-rate', taxSettingController.getCurrentTaxRate);
router.get('/type/:type', taxSettingController.getTaxSettingsByType);
router.get('/:id', taxSettingController.getTaxSettingById);
router.post('/', taxSettingController.createTaxSetting);
router.put('/:id', taxSettingController.updateTaxSetting);
router.put('/:id/set-default', taxSettingController.setDefaultTaxSetting);
router.delete('/:id', taxSettingController.deleteTaxSetting);

module.exports = router;
