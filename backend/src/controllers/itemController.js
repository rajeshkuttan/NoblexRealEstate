/**
 * Item Controller
 * Handles Item Master operations for Procurement Module
 */

const { Item, ChartOfAccount, User, PurchaseOrder, sequelize } = require('../models');
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');

/**
 * Generate unique item code
 */
async function generateItemCode() {
  const year = new Date().getFullYear();
  const count = await Item.count();
  const code = `ITM-${year}-${String(count + 1).padStart(4, '0')}`;
  
  // Check if code exists (unlikely but possible)
  const exists = await Item.findOne({ where: { itemCode: code } });
  if (exists) {
    return `ITM-${year}-${String(count + 2).padStart(4, '0')}`;
  }
  return code;
}

/**
 * Get all items with filters and pagination
 */
exports.getAllItems = async (req, res, next) => {
  try {
    const { search, category, accountId } = req.query;
    const { page, limit, offset } = normalizePagination(req.query, 10, 500);

    const whereClause = {
      isActive: true
    };

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { itemCode: { [Op.like]: `%${search}%` } },
        { itemName: { [Op.like]: `%${search}%` } }
      ];
    }

    // Category filter
    if (category) {
      whereClause.itemCategory = category;
    }

    // Account filter
    if (accountId) {
      whereClause.accountId = accountId;
    }

    const { count, rows: items } = await Item.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: ChartOfAccount,
          as: 'account',
          attributes: ['id', 'accountCode', 'accountName', 'accountType'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      distinct: true
    });

    res.json({
      success: true,
      data: {
        items,
        pagination: createPaginationMeta(count, page, limit)
      }
    });
  } catch (error) {
    console.error('Error in getAllItems:', error);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get item by ID
 */
exports.getItemById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await Item.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: ChartOfAccount,
          as: 'account',
          attributes: ['id', 'accountCode', 'accountName', 'accountType']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    res.json({
      success: true,
      data: { item }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new item
 */
exports.createItem = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { itemName, itemCategory, unitOfMeasure, accountId, description } = req.body;

    // Validate account exists and is expense/asset type
    const account = await ChartOfAccount.findByPk(accountId, { transaction });
    if (!account) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    if (!['expense', 'asset'].includes(account.accountType)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Account must be of type expense or asset'
      });
    }

    // Generate item code
    const itemCode = await generateItemCode();

    // Check for duplicate item name (optional validation)
    const existingItem = await Item.findOne({
      where: { itemName, isActive: true },
      transaction
    });

    if (existingItem) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Item with this name already exists'
      });
    }

    // Create item
    const item = await Item.create({
      itemCode,
      itemName,
      itemCategory: itemCategory || 'material',
      unitOfMeasure: unitOfMeasure || 'pcs',
      accountId,
      description,
      createdBy: req.user.id
    }, { transaction });

    await transaction.commit();

    // Fetch created item with associations
    const createdItem = await Item.findByPk(item.id, {
      include: [
        {
          model: ChartOfAccount,
          as: 'account',
          attributes: ['id', 'accountCode', 'accountName', 'accountType']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: { item: createdItem }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Update item
 */
exports.updateItem = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { itemName, itemCategory, unitOfMeasure, accountId, description, isActive } = req.body;

    const item = await Item.findOne({
      where: { id, isActive: true },
      transaction
    });

    if (!item) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // If account is being changed, validate it
    if (accountId && accountId !== item.accountId) {
      const account = await ChartOfAccount.findByPk(accountId, { transaction });
      if (!account) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Account not found'
        });
      }

      if (!['expense', 'asset'].includes(account.accountType)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Account must be of type expense or asset'
        });
      }
    }

    // Update item
    await item.update({
      itemName: itemName || item.itemName,
      itemCategory: itemCategory || item.itemCategory,
      unitOfMeasure: unitOfMeasure || item.unitOfMeasure,
      accountId: accountId || item.accountId,
      description: description !== undefined ? description : item.description,
      isActive: isActive !== undefined ? isActive : item.isActive
    }, { transaction });

    await transaction.commit();

    // Fetch updated item with associations
    const updatedItem = await Item.findByPk(item.id, {
      include: [
        {
          model: ChartOfAccount,
          as: 'account',
          attributes: ['id', 'accountCode', 'accountName', 'accountType']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Item updated successfully',
      data: { item: updatedItem }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Delete item (soft delete)
 */
exports.deleteItem = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const item = await Item.findOne({
      where: { id, isActive: true },
      transaction
    });

    if (!item) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Item not found'
      });
    }

    // Check if item is used in any Purchase Order
    // Search in JSON column line_items for the item_id
    // Note: Using strict JSON search pattern
    const usedInPO = await PurchaseOrder.findOne({
      where: sequelize.literal(`JSON_CONTAINS(line_items, '{"item_id": ${parseInt(id)}}')`),
      transaction
    });

    if (usedInPO) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Item cannot be deleted as it has been used in a Purchase Order'
      });
    }

    // Soft delete
    await item.update({ isActive: false }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};
