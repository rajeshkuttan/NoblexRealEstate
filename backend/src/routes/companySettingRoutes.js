const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const companySettingController = require('../controllers/companySettingController');
const { authMiddleware } = require('../middleware/authMiddleware');

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
  }
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
  }
});

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
router.post('/logo', logoUpload.single('logo'), companySettingController.uploadCompanyLogo);

module.exports = router;
