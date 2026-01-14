const Setting = require('../models/Setting');

// Get all settings or by category
const getAllSettings = async (req, res) => {
  try {
    const { category } = req.query;
    const whereClause = category ? { category, isActive: true } : { isActive: true };

    const settings = await Setting.findAll({
      where: whereClause,
      order: [['category', 'ASC'], ['key', 'ASC']]
    });

    // Convert to key-value object for easier frontend consumption
    const settingsObj = {};
    settings.forEach(setting => {
      let value = setting.value;
      // Parse based on data type
      if (setting.dataType === 'number') {
        value = parseFloat(value);
      } else if (setting.dataType === 'boolean') {
        value = value === 'true' || value === '1';
      } else if (setting.dataType === 'json') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          value = setting.value;
        }
      }
      settingsObj[setting.key] = value;
    });

    res.json({
      success: true,
      data: {
        settings: settingsObj,
        raw: settings // Also include raw data with metadata
      }
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
};

// Get single setting by key
const getSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await Setting.findOne({ where: { key, isActive: true } });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    let value = setting.value;
    // Parse based on data type
    if (setting.dataType === 'number') {
      value = parseFloat(value);
    } else if (setting.dataType === 'boolean') {
      value = value === 'true' || value === '1';
    } else if (setting.dataType === 'json') {
      try {
        value = JSON.parse(value);
      } catch (e) {
        value = setting.value;
      }
    }

    res.json({
      success: true,
      data: {
        key: setting.key,
        value,
        metadata: setting
      }
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch setting',
      error: error.message
    });
  }
};

// Create or update setting
const upsertSetting = async (req, res) => {
  try {
    const { key, value, category, description, dataType, isSystem } = req.body;

    const [setting, created] = await Setting.upsert({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      category,
      description,
      dataType,
      isSystem,
      isActive: true
    }, {
      returning: true
    });

    res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Setting created successfully' : 'Setting updated successfully',
      data: setting
    });
  } catch (error) {
    console.error('Error upserting setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save setting',
      error: error.message
    });
  }
};

// Update setting
const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, category, description, dataType } = req.body;

    const setting = await Setting.findOne({ where: { key } });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    // Prevent updating system settings key
    if (setting.isSystem && req.body.key && req.body.key !== key) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify system setting key'
      });
    }

    await setting.update({
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      category: category || setting.category,
      description: description || setting.description,
      dataType: dataType || setting.dataType
    });

    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: setting
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update setting',
      error: error.message
    });
  }
};

// Delete setting
const deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;

    const setting = await Setting.findOne({ where: { key } });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    // Prevent deleting system settings
    if (setting.isSystem) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete system setting'
      });
    }

    await setting.destroy();

    res.json({
      success: true,
      message: 'Setting deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete setting',
      error: error.message
    });
  }
};

// Initialize default UAE settings
const initializeDefaultSettings = async (req, res) => {
  try {
    const defaultSettings = [
      {
        key: 'uae_ejari_fee',
        value: '220',
        category: 'UAE',
        description: 'Default Ejari registration fee in AED',
        dataType: 'number',
        isSystem: true
      },
      {
        key: 'uae_dewa_deposit_percentage',
        value: '10',
        category: 'UAE',
        description: 'DEWA deposit as percentage of monthly rent',
        dataType: 'number',
        isSystem: true
      },
      {
        key: 'uae_security_deposit_months',
        value: '1',
        category: 'UAE',
        description: 'Security deposit as number of months rent',
        dataType: 'number',
        isSystem: true
      },
      {
        key: 'uae_agency_fee_percentage',
        value: '5',
        category: 'UAE',
        description: 'Agency fee as percentage of annual rent',
        dataType: 'number',
        isSystem: true
      },
      {
        key: 'uae_municipality_fee_percentage',
        value: '5',
        category: 'UAE',
        description: 'Municipality fee as percentage of annual rent',
        dataType: 'number',
        isSystem: true
      },
      {
        key: 'lease_grace_period_days',
        value: '5',
        category: 'UAE',
        description: 'Default grace period for rent payment in days',
        dataType: 'number',
        isSystem: false
      },
      {
        key: 'pdc_required',
        value: 'true',
        category: 'UAE',
        description: 'Whether post-dated cheques are required by default',
        dataType: 'boolean',
        isSystem: false
      }
    ];

    const results = [];
    for (const setting of defaultSettings) {
      const [record, created] = await Setting.findOrCreate({
        where: { key: setting.key },
        defaults: setting
      });
      results.push({ key: setting.key, created, current: record });
    }

    res.json({
      success: true,
      message: 'Default settings initialized',
      data: results
    });
  } catch (error) {
    console.error('Error initializing settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize settings',
      error: error.message
    });
  }
};

module.exports = {
  getAllSettings,
  getSettingByKey,
  upsertSetting,
  updateSetting,
  deleteSetting,
  initializeDefaultSettings
};
