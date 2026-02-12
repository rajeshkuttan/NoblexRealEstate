const ServiceTemplate = require('../models/ServiceTemplate');
const ChartOfAccount = require('../models/ChartOfAccount');
const { Op } = require('sequelize');

// Get all service templates
exports.getAll = async (req, res, next) => {
  try {
    const { search, category, activeOnly = 'true' } = req.query;

    const whereClause = {};
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (category) {
      whereClause.category = category;
    }
    
    if (activeOnly === 'true') {
      whereClause.isActive = true;
    }

    const templates = await ServiceTemplate.findAll({
      where: whereClause,
      include: [{
        model: ChartOfAccount,
        as: 'account',
        attributes: ['id', 'accountCode', 'accountName', 'accountType'],
        required: false
      }],
      order: [['sortOrder', 'ASC'], ['name', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        templates,
        count: templates.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get service template by ID
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const template = await ServiceTemplate.findByPk(id, {
      include: [{
        model: ChartOfAccount,
        as: 'account',
        attributes: ['id', 'accountCode', 'accountName', 'accountType'],
        required: false
      }]
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Service template not found'
      });
    }

    res.json({
      success: true,
      data: { template }
    });
  } catch (error) {
    next(error);
  }
};

// Get templates by category
exports.getByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;

    const templates = await ServiceTemplate.findAll({
      where: {
        category,
        isActive: true
      },
      include: [{
        model: ChartOfAccount,
        as: 'account',
        attributes: ['id', 'accountCode', 'accountName', 'accountType'],
        required: false
      }],
      order: [['sortOrder', 'ASC'], ['name', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        templates,
        count: templates.length,
        category
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create new service template
exports.create = async (req, res, next) => {
  try {
    const {
      name,
      defaultAmount,
      isTaxable,
      billingMethod,
      description,
      category,
      sortOrder,
      accountId
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Service template name is required'
      });
    }

    if (defaultAmount === undefined || defaultAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid default amount is required'
      });
    }

    if (!['included_in_rental', 'charged_separately'].includes(billingMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid billing method'
      });
    }

    const template = await ServiceTemplate.create({
      name,
      defaultAmount: parseFloat(defaultAmount) || 0,
      isTaxable: Boolean(isTaxable),
      billingMethod,
      description,
      category: category || 'Custom',
      sortOrder: sortOrder || 0,
      accountId: accountId || null,
      isActive: true,
      isSystem: false // User-created templates are not system templates
    });

    res.status(201).json({
      success: true,
      message: 'Service template created successfully',
      data: { template }
    });
  } catch (error) {
    next(error);
  }
};

// Update service template
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      defaultAmount,
      isTaxable,
      billingMethod,
      description,
      category,
      sortOrder,
      isActive,
      accountId
    } = req.body;

    const template = await ServiceTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Service template not found'
      });
    }

    // Validate billing method if provided
    if (billingMethod && !['included_in_rental', 'charged_separately'].includes(billingMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid billing method'
      });
    }

    // Update fields
    if (name !== undefined) template.name = name;
    if (defaultAmount !== undefined) template.defaultAmount = parseFloat(defaultAmount);
    if (isTaxable !== undefined) template.isTaxable = Boolean(isTaxable);
    if (billingMethod !== undefined) template.billingMethod = billingMethod;
    if (description !== undefined) template.description = description;
    if (category !== undefined) template.category = category;
    if (sortOrder !== undefined) template.sortOrder = sortOrder;
    if (isActive !== undefined) template.isActive = Boolean(isActive);
    if (accountId !== undefined) template.accountId = accountId || null;

    await template.save();

    res.json({
      success: true,
      message: 'Service template updated successfully',
      data: { template }
    });
  } catch (error) {
    next(error);
  }
};

// Delete service template
exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { hard } = req.query;

    const template = await ServiceTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Service template not found'
      });
    }

    // Prevent deletion of system templates
    if (template.isSystem) {
      return res.status(403).json({
        success: false,
        message: 'System templates cannot be deleted'
      });
    }

    if (hard === 'true') {
      // Hard delete - permanently remove from database
      await template.destroy();
      res.json({
        success: true,
        message: 'Service template permanently deleted'
      });
    } else {
      // Soft delete - just mark as inactive
      template.isActive = false;
      await template.save();
      res.json({
        success: true,
        message: 'Service template deactivated successfully'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Get categories
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await ServiceTemplate.findAll({
      attributes: ['category'],
      group: ['category'],
      where: { isActive: true }
    });

    const categoryList = categories
      .map(t => t.category)
      .filter(c => c);

    res.json({
      success: true,
      data: {
        categories: categoryList,
        count: categoryList.length
      }
    });
  } catch (error) {
    next(error);
  }
};
