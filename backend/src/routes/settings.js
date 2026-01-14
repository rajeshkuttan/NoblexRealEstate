const express = require('express');
const router = express.Router();
const {
  getAllSettings,
  getSettingByKey,
  upsertSetting,
  updateSetting,
  deleteSetting,
  initializeDefaultSettings
} = require('../controllers/settingsController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Initialize default settings (admin only)
router.post('/initialize', initializeDefaultSettings);

// Get all settings or by category
router.get('/', getAllSettings);

// Get single setting by key
router.get('/:key', getSettingByKey);

// Create or update setting (upsert)
router.post('/', upsertSetting);

// Update existing setting
router.put('/:key', updateSetting);

// Delete setting
router.delete('/:key', deleteSetting);

module.exports = router;
