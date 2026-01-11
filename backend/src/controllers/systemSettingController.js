const { SystemSetting, User } = require('../models');
const { Op } = require('sequelize');

// Get all system settings
const getAllSettings = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, category } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { settingKey: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    if (category) whereClause.category = category;

    const settings = await SystemSetting.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['category', 'ASC'], ['settingKey', 'ASC']],
      include: [
        {
          model: User,
          as: 'updater'
        }
      ]
    });

    res.json({
      success: true,
      data: {
        settings: settings.rows,
        pagination: {
          total: settings.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(settings.count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get setting by key
const getSettingByKey = async (req, res, next) => {
  try {
    const { key } = req.params;
    const setting = await SystemSetting.findOne({
      where: { settingKey: key },
      include: [
        {
          model: User,
          as: 'updater'
        }
      ]
    });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    next(error);
  }
};

// Create new setting
const createSetting = async (req, res, next) => {
  try {
    const settingData = req.body;
    const setting = await SystemSetting.create(settingData);

    res.status(201).json({
      success: true,
      message: 'Setting created successfully',
      data: setting
    });
  } catch (error) {
    next(error);
  }
};

// Update setting
const updateSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const updateData = req.body;

    const setting = await SystemSetting.findOne({ where: { settingKey: key } });
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    await setting.update(updateData);

    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: setting
    });
  } catch (error) {
    next(error);
  }
};

// Delete setting
const deleteSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const setting = await SystemSetting.findOne({ where: { settingKey: key } });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    await setting.destroy();

    res.json({
      success: true,
      message: 'Setting deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get settings by category
const getSettingsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    
    const settings = await SystemSetting.findAll({
      where: { category },
      include: [
        {
          model: User,
          as: 'updater'
        }
      ],
      order: [['settingKey', 'ASC']]
    });

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// Get all categories
const getCategories = async (req, res, next) => {
  try {
    const categories = await SystemSetting.findAll({
      attributes: ['category'],
      group: ['category'],
      order: [['category', 'ASC']]
    });

    const categoryList = categories.map(cat => cat.category);

    res.json({
      success: true,
      data: categoryList
    });
  } catch (error) {
    next(error);
  }
};

// Bulk update settings
const bulkUpdateSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;
    const updatedSettings = [];

    for (const setting of settings) {
      const existingSetting = await SystemSetting.findOne({
        where: { settingKey: setting.settingKey }
      });

      if (existingSetting) {
        await existingSetting.update({
          settingValue: setting.settingValue,
          updatedBy: req.user.id
        });
        updatedSettings.push(existingSetting);
      }
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSettings,
  getSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting,
  getSettingsByCategory,
  getCategories,
  bulkUpdateSettings
};
