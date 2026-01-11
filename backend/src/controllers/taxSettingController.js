const { TaxSetting } = require('../models');
const { Op } = require('sequelize');

// Get all tax settings
const getAllTaxSettings = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, type, isActive } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { taxName: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    if (type) whereClause.taxType = type;
    if (isActive !== undefined) whereClause.isActive = isActive === 'true';

    const taxSettings = await TaxSetting.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        taxSettings: taxSettings.rows,
        pagination: {
          total: taxSettings.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(taxSettings.count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get tax setting by ID
const getTaxSettingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const taxSetting = await TaxSetting.findByPk(id);

    if (!taxSetting) {
      return res.status(404).json({
        success: false,
        message: 'Tax setting not found'
      });
    }

    res.json({
      success: true,
      data: taxSetting
    });
  } catch (error) {
    next(error);
  }
};

// Create new tax setting
const createTaxSetting = async (req, res, next) => {
  try {
    const taxSettingData = req.body;
    const taxSetting = await TaxSetting.create(taxSettingData);

    res.status(201).json({
      success: true,
      message: 'Tax setting created successfully',
      data: taxSetting
    });
  } catch (error) {
    next(error);
  }
};

// Update tax setting
const updateTaxSetting = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const taxSetting = await TaxSetting.findByPk(id);
    if (!taxSetting) {
      return res.status(404).json({
        success: false,
        message: 'Tax setting not found'
      });
    }

    await taxSetting.update(updateData);

    res.json({
      success: true,
      message: 'Tax setting updated successfully',
      data: taxSetting
    });
  } catch (error) {
    next(error);
  }
};

// Delete tax setting
const deleteTaxSetting = async (req, res, next) => {
  try {
    const { id } = req.params;
    const taxSetting = await TaxSetting.findByPk(id);

    if (!taxSetting) {
      return res.status(404).json({
        success: false,
        message: 'Tax setting not found'
      });
    }

    await taxSetting.destroy();

    res.json({
      success: true,
      message: 'Tax setting deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get active tax settings
const getActiveTaxSettings = async (req, res, next) => {
  try {
    const taxSettings = await TaxSetting.findAll({
      where: { isActive: true },
      order: [['taxType', 'ASC']]
    });

    res.json({
      success: true,
      data: taxSettings
    });
  } catch (error) {
    next(error);
  }
};

// Get default tax setting
const getDefaultTaxSetting = async (req, res, next) => {
  try {
    const taxSetting = await TaxSetting.findOne({
      where: { isDefault: true, isActive: true }
    });

    if (!taxSetting) {
      return res.status(404).json({
        success: false,
        message: 'Default tax setting not found'
      });
    }

    res.json({
      success: true,
      data: taxSetting
    });
  } catch (error) {
    next(error);
  }
};

// Set default tax setting
const setDefaultTaxSetting = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Remove default from all tax settings
    await TaxSetting.update(
      { isDefault: false },
      { where: { isDefault: true } }
    );

    // Set new default
    const taxSetting = await TaxSetting.findByPk(id);
    if (!taxSetting) {
      return res.status(404).json({
        success: false,
        message: 'Tax setting not found'
      });
    }

    await taxSetting.update({ isDefault: true });

    res.json({
      success: true,
      message: 'Default tax setting updated successfully',
      data: taxSetting
    });
  } catch (error) {
    next(error);
  }
};

// Get tax settings by type
const getTaxSettingsByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    
    const taxSettings = await TaxSetting.findAll({
      where: { taxType: type, isActive: true },
      order: [['effectiveDate', 'DESC']]
    });

    res.json({
      success: true,
      data: taxSettings
    });
  } catch (error) {
    next(error);
  }
};

// Get current tax rate
const getCurrentTaxRate = async (req, res, next) => {
  try {
    const { type } = req.query;
    const currentDate = new Date();

    const whereClause = {
      isActive: true,
      effectiveDate: {
        [Op.lte]: currentDate
      }
    };

    if (type) {
      whereClause.taxType = type;
    }

    const taxSetting = await TaxSetting.findOne({
      where: whereClause,
      order: [['effectiveDate', 'DESC']]
    });

    if (!taxSetting) {
      return res.status(404).json({
        success: false,
        message: 'No active tax setting found'
      });
    }

    res.json({
      success: true,
      data: taxSetting
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTaxSettings,
  getTaxSettingById,
  createTaxSetting,
  updateTaxSetting,
  deleteTaxSetting,
  getActiveTaxSettings,
  getDefaultTaxSetting,
  setDefaultTaxSetting,
  getTaxSettingsByType,
  getCurrentTaxRate
};
