const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const companySettingController = require('../controllers/companySettingController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');
const { requirePermission } = require('../middleware/auth');

const logoDir = path.join(__dirname, '../../uploads/company');
if (!fs.existsSync(logoDir)) {
  fs.mkdirSync(logoDir, { recursive: true });
}

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logoDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safe = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? ext : '.png';
    cb(null, `logo-${Date.now()}${safe}`);
  },
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp)$/i.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, or WEBP images are allowed'));
    }
  },
});

router.use(authMiddleware);

router.get('/my-companies', companySettingController.getMyCompanies);
router.get('/current', resolveCompanyContext, companySettingController.getCurrentCompany);
router.post('/switch', companySettingController.switchCompany);

router.get('/all', requirePermission('module:company_settings:view'), companySettingController.getAllCompanies);

router.get('/profile', companySettingController.getCompanyProfile);
router.get('/business-info', companySettingController.getBusinessInfo);
router.get('/', companySettingController.getCompanySettings);

router.post('/', requirePermission('module:company_settings:create'), companySettingController.createCompanySettings);
router.put('/', requirePermission('module:company_settings:update'), companySettingController.updateCompanySettings);
router.put('/profile', requirePermission('module:company_settings:update'), companySettingController.updateCompanyProfile);
router.put('/business-info', requirePermission('module:company_settings:update'), companySettingController.updateBusinessInfo);
router.post('/logo', requirePermission('module:company_settings:update'), logoUpload.single('logo'), companySettingController.uploadCompanyLogo);

router.get('/:id/audit', requirePermission('module:company_settings:audit'), companySettingController.getCompanyAudit);
router.get('/:id/users', requirePermission('module:company_settings:view'), companySettingController.getCompanyUsersHandler);
router.post('/:id/users', requirePermission('module:company_settings:assign_users'), companySettingController.addCompanyUserHandler);
router.delete('/:id/users/:userId', requirePermission('module:company_settings:assign_users'), companySettingController.removeCompanyUserHandler);
router.patch('/:id/users/:userId/default', requirePermission('module:company_settings:assign_users'), companySettingController.setUserDefaultForCompany);
router.post('/:id/set-default', companySettingController.setDefaultCompanyHandler);
router.patch('/:id/status', requirePermission('module:company_settings:update'), companySettingController.patchCompanyStatus);
router.get('/:id', requirePermission('module:company_settings:view'), companySettingController.getCompanyById);
router.put('/:id', requirePermission('module:company_settings:update'), companySettingController.updateCompanyById);

module.exports = router;
