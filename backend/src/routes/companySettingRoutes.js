const express = require('express');
const router = express.Router();
const companySettingController = require('../controllers/companySettingController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Company Setting routes
router.get('/all', companySettingController.getAllCompanies);
router.get('/', companySettingController.getCompanySettings);
router.get('/profile', companySettingController.getCompanyProfile);
router.get('/business-info', companySettingController.getBusinessInfo);
router.post('/', companySettingController.createCompanySettings);
router.put('/', companySettingController.updateCompanySettings);
router.put('/profile', companySettingController.updateCompanyProfile);
router.put('/business-info', companySettingController.updateBusinessInfo);

module.exports = router;
