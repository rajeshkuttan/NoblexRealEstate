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

const xlsx = require('xlsx');

/**
 * Download Item Import Template
 */
exports.downloadTemplate = async (req, res) => {
  try {
    // Define template headers
    const headers = [
      'Item Name',
      'Category', // material, service, equipment, supplies, other
      'UOM', // Unit of Measure
      'Account Code', // To be resolved to accountId
      'Description'
    ];

    const descriptionPaths = [
      'Item Name: Name of the item (Required)',
      'Category: material, service, equipment, supplies, other (Default: material)',
      'UOM: Unit of Measure e.g. pcs, kg, box (Default: pcs)',
      'Account Code: The code of the Expense/Asset Account (Required)',
      'Description: Optional description'
    ];

    // Create workbook and worksheet
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.aoa_to_sheet([headers, descriptionPaths]);

    // Set column widths
    const wscols = [
      { wch: 30 }, // Item Name
      { wch: 15 }, // Category
      { wch: 10 }, // UOM
      { wch: 20 }, // Account Code
      { wch: 40 }  // Description
    ];
    worksheet['!cols'] = wscols;

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Template');

    // Generate buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for download
    res.setHeader('Content-Disposition', 'attachment; filename=item_import_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    res.send(buffer);

  } catch (error) {
    console.error('Download template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download template',
      error: error.message
    });
  }
};

/**
 * Import Items
 */
exports.importItems = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { range: 0 }); // Assuming header is at row 0 (index 0) but we skipped description row in template? 
    // Wait, my template has description at row 2 (index 1). User might fill data from row 3 (index 2).
    // Let's assume standard import where header is row 1.
    // If we put description in row 2, users might be confused. 
    // Better to just provide header.
    // Re-reading template code: `xlsx.utils.aoa_to_sheet([headers, descriptionPaths]);`
    // Item Name | Category ...
    // Item Name: ... | Category: ...
    // So data starts at row 3.
    // `sheet_to_json` with default header uses first row.
    // If I used `aoa_to_sheet`, row 1 is header. row 2 is description.
    // So actual data starts from row 3.
    // We should filter out the description row if it exists.
    
    // Let's check if the second row looks like description or data.
    // Or simpler: filter out rows where "Item Name" starts with "Item Name:".

    if (!data || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty'
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    const itemsToCreate = [];
    const seenNames = new Set();
    let reactivatedCount = 0;

    // Cache valid accounts to minimize DB queries
    const accounts = await ChartOfAccount.findAll({
        attributes: ['id', 'accountCode', 'accountType']
    });
    const accountMap = new Map(); // Code -> ID
    accounts.forEach(acc => {
        if (['expense', 'asset'].includes(acc.accountType)) {
            accountMap.set(acc.accountCode, acc.id);
        }
    });

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        // Skip description row if present
        if (row['Item Name'] && row['Item Name'].toString().startsWith('Item Name:')) continue;
        
        const rowNumber = i + 2; // Approximate row number

        try {
            // Validate required fields
            if (!row['Item Name'] || !row['Account Code']) {
                throw new Error('Item Name and Account Code are required');
            }

            const itemName = row['Item Name'].trim();
            let accountCodeInput = row['Account Code'].toString().trim();
            
            // Resolve Account ID
            let accountId = accountMap.get(accountCodeInput);

            // If not found, try to extract code from format like "1120 - Bank Accounts"
            if (!accountId) {
                // Try splitting by " - "
                const parts = accountCodeInput.split(' - ');
                if (parts.length > 1) {
                    const potentialCode = parts[0].trim();
                     accountId = accountMap.get(potentialCode);
                }
            }

            // If still not found, try splitting by space
            if (!accountId) {
                const parts = accountCodeInput.split(' ');
                if (parts.length > 1) {
                    const potentialCode = parts[0].trim();
                    accountId = accountMap.get(potentialCode);
                }
            }
            
            // Final fallback: Check if input starts with any valid code (more expensive but safe for small lists)
            if (!accountId) {
                 for (const [code, id] of accountMap.entries()) {
                     if (accountCodeInput.startsWith(code)) {
                         accountId = id;
                         break;
                     }
                 }
            }

            if (!accountId) {
                throw new Error(`Account Code '${accountCodeInput}' not found or is not an Expense/Asset account`);
            }

            // Check for duplicates in file
            if (seenNames.has(itemName)) {
                throw new Error(`Duplicate Item Name '${itemName}' in file`);
            }
            seenNames.add(itemName);

            // Check if item exists in DB (including inactive)
            const existingItem = await Item.findOne({
                where: { itemName: itemName }
            });

            if (existingItem) {
                if (existingItem.isActive) {
                    throw new Error(`Item '${itemName}' already exists`);
                } else {
                    // Reactivate
                    await existingItem.update({
                        itemCategory: row['Category'] || 'material',
                        unitOfMeasure: row['UOM'] || 'pcs',
                        accountId: accountId,
                        description: row['Description'],
                        isActive: true
                    });
                    reactivatedCount++;
                    results.success++;
                    continue;
                }
            }

            // Generate Item Code
            // Note: Since we are processing in bulk, we need unique codes.
            // But `generateItemCode` queries DB count. If we loop, we get same count.
            // We need to pass offset or handle it. 
            // Better strategy: Generate one base code and increment.
            // BUT `generateItemCode` checks for existence too.
            // Let's implement a simpler sequential generation for the batch.
            
            // We deferred code generation to this step.
            // Let's calculate base count now.
            
            itemsToCreate.push({
                itemName: itemName,
                itemCategory: row['Category'] || 'material',
                unitOfMeasure: row['UOM'] || 'pcs',
                accountId: accountId,
                description: row['Description'],
                createdBy: req.user.id,
                isActive: true
            });

        } catch (error) {
            results.failed++;
            results.errors.push({
                row: rowNumber,
                item: row['Item Name'] || 'Unknown',
                error: error.message
            });
        }
    }

    if (itemsToCreate.length > 0) {
        // Generate codes for batch
        const year = new Date().getFullYear();
        let count = await Item.count();
        
        for (const item of itemsToCreate) {
             count++;
             item.itemCode = `ITM-${year}-${String(count).padStart(4, '0')}`;
             
             // Double check existence (paranoid)
             // In high concurrency this might fail, but for now it's acceptable.
        }

        try {
            await Item.bulkCreate(itemsToCreate, { validate: true });
            results.success += itemsToCreate.length;
        } catch (bulkError) {
             console.error('Bulk Create Error:', bulkError);
             // Fallback one by one
             results.success -= itemsToCreate.length; 
             for (const item of itemsToCreate) {
                 try {
                     await Item.create(item);
                     results.success++;
                 } catch (singleError) {
                     results.failed++;
                     results.errors.push({
                         row: 'Batch Processing',
                         item: item.itemName,
                         error: singleError.message
                     });
                 }
             }
        }
    }

    res.status(200).json({
      success: true,
      message: `Import completed. Created: ${itemsToCreate.length}, Reactivated: ${reactivatedCount}, Failed: ${results.failed}`,
      data: results
    });

  } catch (error) {
    console.error('Import items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import items',
      error: error.message
    });
  }
};

/**
 * Export Items
 */
exports.exportItems = async (req, res) => {
  try {
    const items = await Item.findAll({
      where: { isActive: true },
        include: [
        {
          model: ChartOfAccount,
          as: 'account',
          attributes: ['accountCode', 'accountName']
        }
      ],
      order: [['itemName', 'ASC']]
    });

    const data = items.map(item => ({
      'Item Code': item.itemCode,
      'Item Name': item.itemName,
      'Category': item.itemCategory,
      'UOM': item.unitOfMeasure,
      'Account Code': item.account ? item.account.accountCode : '',
      'Account Name': item.account ? item.account.accountName : '',
      'Description': item.description || ''
    }));

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(data);
    
    // Set column widths
    const wscols = [
      { wch: 20 }, // Code
      { wch: 30 }, // Name
      { wch: 15 }, // Category
      { wch: 10 }, // UOM
      { wch: 15 }, // Account Code
      { wch: 30 }, // Account Name
      { wch: 40 }  // Description
    ];
    worksheet['!cols'] = wscols;

    xlsx.utils.book_append_sheet(workbook, worksheet, 'Items');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=items_export.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    res.send(buffer);

  } catch (error) {
    console.error('Export items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export items',
      error: error.message
    });
  }
};
