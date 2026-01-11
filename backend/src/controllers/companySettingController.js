const { CompanySetting } = require('../models');

// Get company settings
const getCompanySettings = async (req, res, next) => {
  try {
    const settings = await CompanySetting.findOne({
      where: { isActive: true }
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Company settings not found'
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// Update company settings
const updateCompanySettings = async (req, res, next) => {
  try {
    const updateData = req.body;
    
    let settings = await CompanySetting.findOne({
      where: { isActive: true }
    });

    if (!settings) {
      // Create new settings if none exist
      settings = await CompanySetting.create(updateData);
    } else {
      // Update existing settings
      await settings.update(updateData);
    }

    res.json({
      success: true,
      message: 'Company settings updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// Create company settings
const createCompanySettings = async (req, res, next) => {
  try {
    const settingsData = req.body;
    const settings = await CompanySetting.create(settingsData);

    res.status(201).json({
      success: true,
      message: 'Company settings created successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// Get company profile
const getCompanyProfile = async (req, res, next) => {
  try {
    const settings = await CompanySetting.findOne({
      where: { isActive: true },
      attributes: [
        'companyName',
        'companyNameArabic',
        'address',
        'city',
        'emirate',
        'phone',
        'email',
        'website',
        'logo',
        'currency',
        'timezone',
        'language'
      ]
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Company profile not found'
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// Update company profile
const updateCompanyProfile = async (req, res, next) => {
  try {
    const updateData = req.body;
    
    let settings = await CompanySetting.findOne({
      where: { isActive: true }
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Company settings not found'
      });
    }

    await settings.update(updateData);

    res.json({
      success: true,
      message: 'Company profile updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// Get business information
const getBusinessInfo = async (req, res, next) => {
  try {
    const settings = await CompanySetting.findOne({
      where: { isActive: true },
      attributes: [
        'tradeLicense',
        'commercialRegister',
        'taxNumber',
        'vatNumber',
        'fiscalYearStart',
        'fiscalYearEnd',
        'businessHours',
        'socialMedia'
      ]
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Business information not found'
      });
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// Update business information
const updateBusinessInfo = async (req, res, next) => {
  try {
    const updateData = req.body;
    
    let settings = await CompanySetting.findOne({
      where: { isActive: true }
    });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Company settings not found'
      });
    }

    await settings.update(updateData);

    res.json({
      success: true,
      message: 'Business information updated successfully',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCompanySettings,
  updateCompanySettings,
  createCompanySettings,
  getCompanyProfile,
  updateCompanyProfile,
  getBusinessInfo,
  updateBusinessInfo
};
