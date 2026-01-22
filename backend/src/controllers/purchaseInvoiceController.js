/**
 * Purchase Invoice Controller
 * Handles Purchase Invoice operations with accounting integration
 */

const { PurchaseInvoice, Vendor, PurchaseOrder, GoodsReceipt, Item, ChartOfAccount, FinancialTransaction, User, Property, Unit, Lease, sequelize } = require('../models');
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');

/**
 * Generate unique invoice number
 */
async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const count = await PurchaseInvoice.count();
  const number = `PI-${year}-${String(count + 1).padStart(4, '0')}`;
  
  const exists = await PurchaseInvoice.findOne({ where: { invoiceNumber: number } });
  if (exists) {
    return `PI-${year}-${String(count + 2).padStart(4, '0')}`;
  }
  return number;
}

/**
 * Generate unique transaction number
 * @param {Transaction} transaction - Optional transaction context for database operations
 */
async function generateTransactionNumber(transaction = null) {
  const year = new Date().getFullYear();
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    // Get count of transactions for this year
    const count = await FinancialTransaction.count({
      where: {
        transactionNumber: {
          [Op.like]: `TXN-${year}-%`
        }
      },
      transaction
    });
    
    // Use timestamp component to ensure uniqueness even in rapid succession
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    const number = `TXN-${year}-${String(count + 1 + attempts + randomSuffix).padStart(6, '0')}`;
    
    // Check if this number already exists
    const exists = await FinancialTransaction.findOne({ 
      where: { transactionNumber: number },
      transaction
    });
    
    if (!exists) {
      return number;
    }
    
    attempts++;
  }
  
  // Fallback: use timestamp if all attempts fail
  const timestamp = Date.now();
  return `TXN-${year}-${String(timestamp).slice(-6)}`;
}

/**
 * Get or create Accounts Payable account for vendor
 */
async function getOrCreateAPAccount(vendorId, vendorName, transaction) {
  // Try to find existing AP account for this vendor
  let apAccount = await ChartOfAccount.findOne({
    where: {
      accountName: { [Op.like]: `Accounts Payable - ${vendorName}%` },
      accountType: 'liability',
      isActive: true
    },
    transaction
  });

  if (!apAccount) {
    // Find parent AP account or create one
    let parentAP = await ChartOfAccount.findOne({
      where: {
        accountName: 'Accounts Payable',
        accountType: 'liability',
        isActive: true
      },
      transaction
    });

    if (!parentAP) {
      // Create parent AP account
      parentAP = await ChartOfAccount.create({
        accountCode: `2000-${new Date().getFullYear()}`,
        accountName: 'Accounts Payable',
        accountType: 'liability',
        isActive: true,
        description: 'Accounts Payable - Parent Account'
      }, { transaction });
    }

    // Create vendor-specific AP account
    const accountCode = `2000-${String(vendorId).padStart(4, '0')}`;
    apAccount = await ChartOfAccount.create({
      accountCode,
      accountName: `Accounts Payable - ${vendorName}`,
      accountType: 'liability',
      parentAccountId: parentAP.id,
      level: 2,
      isActive: true,
      description: `Accounts Payable for ${vendorName}`
    }, { transaction });
  }

  return apAccount;
}

/**
 * Calculate totals from line items (item-wise tax) - UAE FTA compliant
 */
function calculateTotals(lineItems) {
  let subtotal = 0;
  let taxAmount = 0;
  
  lineItems.forEach(item => {
    const itemSubtotal = parseFloat(item.total) || 0;
    subtotal += itemSubtotal;
    
    // Calculate tax based on UAE FTA classification
    const classification = item.tax_classification || 'Standard-Rated';
    let itemTax = 0;
    let itemTaxPercent = 0;
    
    if (classification === 'Standard-Rated' || classification === 'Standard-Rated (5%)') {
      itemTaxPercent = parseFloat(item.tax_percent) || 5; // Default 5% for UAE
      itemTax = (itemSubtotal * itemTaxPercent) / 100;
      item.taxable = true;
    } else if (classification === 'Zero-Rated' || classification === 'Zero-Rated (0%)') {
      itemTaxPercent = 0;
      itemTax = 0;
      item.taxable = true; // Zero-rated is still taxable supply
    } else if (classification === 'Exempt') {
      itemTaxPercent = 0;
      itemTax = 0;
      item.taxable = false;
    } else {
      // Fallback for old data or migration
      const isTaxable = item.taxable === true;
      itemTaxPercent = isTaxable ? (parseFloat(item.tax_percent) || 5) : 0;
      itemTax = (itemSubtotal * itemTaxPercent) / 100;
      
      // Migrate old classification
      if (!item.tax_classification) {
        item.tax_classification = isTaxable ? 'Standard-Rated (5%)' : 'Exempt';
      }
    }
    
    taxAmount += itemTax;
    
    // Update item tax fields
    item.tax_percent = itemTaxPercent;
    item.tax_amount = itemTax;
  });
  
  const totalAmount = subtotal + taxAmount;
  return { subtotal, taxAmount, totalAmount };
}

/**
 * Post accounting entries for purchase invoice
 */
async function postAccountingEntries(purchaseInvoice, transaction) {
  // Parse lineItems if it's a JSON string
  let lineItems = purchaseInvoice.lineItems || [];
  if (typeof lineItems === 'string') {
    try {
      lineItems = JSON.parse(lineItems);
    } catch (parseError) {
      console.error('Error parsing lineItems JSON in postAccountingEntries:', parseError);
      throw new Error('Invalid line items data');
    }
  }
  
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    throw new Error('No line items found in purchase invoice');
  }
  
  const vendor = await Vendor.findByPk(purchaseInvoice.vendorId, { transaction });
  if (!vendor) {
    throw new Error('Vendor not found');
  }

  // Get or create AP account
  const apAccount = await getOrCreateAPAccount(purchaseInvoice.vendorId, vendor.vendorName, transaction);

  const transactionDate = new Date(purchaseInvoice.invoiceDate);
  const entries = [];
  
  // Generate all transaction numbers upfront to avoid duplicates
  const totalTransactionsNeeded = lineItems.length + 1; // One for each line item + one credit entry
  const transactionNumbers = [];
  for (let i = 0; i < totalTransactionsNeeded; i++) {
    const txnNumber = await generateTransactionNumber(transaction);
    transactionNumbers.push(txnNumber);
  }
  let txnNumberIndex = 0;

  // Create debit entries for each line item (item account)
  for (const lineItem of lineItems) {
    if (!lineItem.item_id) {
      console.error('Line item missing item_id:', lineItem);
      continue;
    }
    
    const item = await Item.findByPk(lineItem.item_id, { transaction });
    if (!item) {
      throw new Error(`Item ${lineItem.item_id} not found`);
    }

    // Use account_id from line item if available, otherwise use item's accountId
    const accountId = lineItem.account_id || item.accountId;
    if (!accountId) {
      throw new Error(`Account ID not found for item ${item.itemCode || item.itemName} (ID: ${item.id})`);
    }

    const account = await ChartOfAccount.findByPk(accountId, { transaction });
    if (!account) {
      throw new Error(`Account ${accountId} not found for item ${item.itemCode}`);
    }

    const amount = parseFloat(lineItem.total) || 0;
    if (amount > 0) {
      const txnNumber = transactionNumbers[txnNumberIndex++];
      const debitEntry = await FinancialTransaction.create({
        transactionNumber: txnNumber,
        transactionDate,
        description: `Purchase Invoice ${purchaseInvoice.invoiceNumber} - ${item.itemName}`,
        reference: purchaseInvoice.invoiceNumber,
        amount,
        currency: 'AED',
        transactionType: 'debit',
        accountId: account.id,
        category: 'other',
        status: 'approved',
        vendorId: purchaseInvoice.vendorId,
        createdBy: purchaseInvoice.createdBy || null,
        approvedBy: purchaseInvoice.approvedBy || null,
        approvedAt: new Date()
      }, { transaction });

      // Update account balance (debit increases expense/asset)
      await account.increment('balance', { by: amount, transaction });

      entries.push(debitEntry);
    }
  }

  // Create credit entry for AP account (total amount)
  const totalAmount = parseFloat(purchaseInvoice.totalAmount) || 0;
  if (totalAmount > 0) {
    const txnNumber = transactionNumbers[txnNumberIndex++];
    const creditEntry = await FinancialTransaction.create({
      transactionNumber: txnNumber,
      transactionDate,
      description: `Purchase Invoice ${purchaseInvoice.invoiceNumber} - ${vendor.vendorName}`,
      reference: purchaseInvoice.invoiceNumber,
      amount: totalAmount,
      currency: 'AED',
      transactionType: 'credit',
      accountId: apAccount.id,
      category: 'other',
      status: 'approved',
      vendorId: purchaseInvoice.vendorId,
      createdBy: purchaseInvoice.createdBy,
      approvedBy: purchaseInvoice.approvedBy,
      approvedAt: new Date()
    }, { transaction });

    // Update account balance (credit increases liability)
    await apAccount.increment('balance', { by: totalAmount, transaction });

    entries.push(creditEntry);
  }

  return entries;
}

/**
 * Reverse accounting entries
 */
async function reverseAccountingEntries(purchaseInvoice, transaction) {
  // Find all transactions related to this invoice
  const transactions = await FinancialTransaction.findAll({
    where: {
      reference: purchaseInvoice.invoiceNumber,
      status: 'approved'
    },
    transaction
  });

  for (const txn of transactions) {
    // Reverse the transaction
    await txn.update({ status: 'reversed' }, { transaction });

    // Reverse account balance
    const account = await ChartOfAccount.findByPk(txn.accountId, { transaction });
    if (account) {
      if (txn.transactionType === 'debit') {
        await account.decrement('balance', { by: txn.amount, transaction });
      } else {
        await account.decrement('balance', { by: txn.amount, transaction });
      }
    }
  }
}

/**
 * Get all purchase invoices with filters and pagination
 */
exports.getAllPurchaseInvoices = async (req, res, next) => {
  try {
    const { search, vendorId, status, paymentStatus, startDate, endDate, propertyId, unitId, leaseId } = req.query;
    const { page, limit, offset } = normalizePagination(req.query, 10, 500);

    const whereClause = {};

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { invoiceNumber: { [Op.like]: `%${search}%` } }
      ];
    }

    // Vendor filter
    if (vendorId) {
      whereClause.vendorId = vendorId;
    }

    // Real estate filters
    if (propertyId) {
      whereClause.propertyId = propertyId;
    }
    if (unitId) {
      whereClause.unitId = unitId;
    }
    if (leaseId) {
      whereClause.leaseId = leaseId;
    }

    // Status filter - support multiple statuses (comma-separated)
    if (status) {
      if (status.includes(',')) {
        // Multiple statuses
        const statusArray = status.split(',').map(s => s.trim());
        whereClause.status = { [Op.in]: statusArray };
      } else {
        // Single status
        whereClause.status = status;
      }
    }

    // Payment status filter
    if (paymentStatus) {
      whereClause.paymentStatus = paymentStatus;
    }

    // Date range filter
    if (startDate && endDate) {
      whereClause.invoiceDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereClause.invoiceDate = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereClause.invoiceDate = {
        [Op.lte]: new Date(endDate)
      };
    }

    const { count, rows: purchaseInvoices } = await PurchaseInvoice.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'vendorName', 'email', 'contactPerson']
        },
        {
          model: PurchaseOrder,
          as: 'purchaseOrder',
          attributes: ['id', 'poNumber'],
          required: false
        },
        {
          model: GoodsReceipt,
          as: 'goodsReceipt',
          attributes: ['id', 'grNumber'],
          required: false
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'location'],
          required: false
        },
        {
          model: Unit,
          as: 'unit',
          attributes: ['id', 'unitNumber', 'type'],
          required: false
        },
        {
          model: Lease,
          as: 'lease',
          attributes: ['id', 'leaseNumber'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'approver',
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
        purchaseInvoices,
        pagination: createPaginationMeta(count, page, limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get purchase invoice by ID
 */
exports.getPurchaseInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('=== GET PURCHASE INVOICE BY ID ===');
    console.log('Invoice ID:', id);

    const purchaseInvoice = await PurchaseInvoice.findByPk(id, {
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'vendorName', 'email', 'contactPerson', 'paymentTerms']
        },
        {
          model: PurchaseOrder,
          as: 'purchaseOrder',
          attributes: ['id', 'poNumber', 'poDate'],
          required: false
        },
        {
          model: GoodsReceipt,
          as: 'goodsReceipt',
          attributes: ['id', 'grNumber', 'receiptDate'],
          required: false
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'location'],
          required: false
        },
        {
          model: Unit,
          as: 'unit',
          attributes: ['id', 'unitNumber', 'type'],
          required: false
        },
        {
          model: Lease,
          as: 'lease',
          attributes: ['id', 'leaseNumber'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });

    if (!purchaseInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Purchase invoice not found'
      });
    }

    // Enrich line items with item details
    // Parse lineItems if it's a string (JSON field from database)
    let lineItems = purchaseInvoice.lineItems || [];
    if (typeof lineItems === 'string') {
      try {
        lineItems = JSON.parse(lineItems);
      } catch (parseError) {
        console.error('Error parsing lineItems JSON:', parseError);
        lineItems = [];
      }
    }
    
    if (!Array.isArray(lineItems)) {
      console.error('lineItems is not an array:', typeof lineItems, lineItems);
      lineItems = [];
    }
    
    console.log('Processing', lineItems.length, 'line items');
    
    const enrichedLineItems = await Promise.all(
      lineItems.map(async (lineItem, index) => {
        try {
          if (!lineItem || !lineItem.item_id) {
            console.error(`Line item ${index} is missing item_id:`, lineItem);
            return null;
          }
          
          const item = await Item.findByPk(lineItem.item_id, {
            attributes: ['id', 'itemCode', 'itemName', 'itemCategory', 'unitOfMeasure'],
            include: [
              {
                model: ChartOfAccount,
                as: 'account',
                attributes: ['id', 'accountCode', 'accountName']
              }
            ]
          });
          
          if (!item) {
            console.error(`Item with ID ${lineItem.item_id} not found`);
            return {
              ...lineItem,
              item: null,
              account: null
            };
          }
          
          return {
            ...lineItem,
            item: item || null,
            account: item?.account || null
          };
        } catch (itemError) {
          console.error(`Error processing line item ${index}:`, itemError);
          return {
            ...lineItem,
            item: null,
            account: null
          };
        }
      })
    );

    // Filter out null line items
    const validLineItems = enrichedLineItems.filter(item => item !== null);

    res.json({
      success: true,
      data: {
        purchaseInvoice: {
          ...purchaseInvoice.toJSON(),
          lineItems: validLineItems
        }
      }
    });
  } catch (error) {
    console.error('=== ERROR GETTING PURCHASE INVOICE BY ID ===');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    next(error);
  }
};

/**
 * Create new purchase invoice
 */
exports.createPurchaseInvoice = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    console.log('Creating Purchase Invoice - Request Body:', JSON.stringify(req.body, null, 2));
    
    const { 
      vendorId, 
      purchaseOrderId, 
      goodsReceiptId, 
      invoiceDate, 
      supplierInvoiceNumber,
      supplierInvoiceDate,
      dueDate, 
      lineItems, 
      notes,
      propertyId,
      unitId,
      leaseId,
      workOrderId,
      deliveryAddress,
      deliveryContactName,
      deliveryContactPhone,
      deliveryInstructions
    } = req.body;

    // Validate required fields
    if (!vendorId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
    }

    if (!invoiceDate) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invoice date is required'
      });
    }

    if (!dueDate) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Due date is required'
      });
    }

    // Validate vendor
    const vendor = await Vendor.findOne({
      where: { id: vendorId, isActive: true },
      transaction
    });

    if (!vendor) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Validate PO if provided
    if (purchaseOrderId) {
      const po = await PurchaseOrder.findByPk(purchaseOrderId, { transaction });
      if (!po) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Purchase order not found'
        });
      }
    }

    // Validate GR if provided
    if (goodsReceiptId) {
      const gr = await GoodsReceipt.findByPk(goodsReceiptId, { transaction });
      if (!gr) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Goods receipt not found'
        });
      }
    }

    // Validate line items
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one line item is required'
      });
    }

    // Validate items exist and get account IDs
    for (let i = 0; i < lineItems.length; i++) {
      const lineItem = lineItems[i];
      
      if (!lineItem.item_id) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Line item ${i + 1} is missing item_id`
        });
      }

      const item = await Item.findOne({
        where: { id: lineItem.item_id, isActive: true },
        include: [
          {
            model: ChartOfAccount,
            as: 'account',
            attributes: ['id', 'accountCode', 'accountName', 'accountType']
          }
        ],
        transaction
      });

      if (!item) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: `Item with ID ${lineItem.item_id} not found`
        });
      }

      // Use account_id from line item if provided, otherwise use item's accountId
      if (!lineItem.account_id) {
        if (!item.accountId) {
          await transaction.rollback();
          console.error(`Validation Error: Item ${item.itemCode || item.itemName} (ID: ${item.id}) does not have an associated account`);
          return res.status(400).json({
            success: false,
            message: `Item ${item.itemCode || item.itemName} (ID: ${item.id}) does not have an associated account. Please set an account for this item in Item Master.`
          });
        }
        lineItem.account_id = item.accountId;
        console.log(`Set account_id from item for line item ${i + 1}: ${item.accountId}`);
      } else {
        console.log(`Using account_id from line item ${i + 1}: ${lineItem.account_id}`);
      }
      
      // Final check - ensure account_id is set
      if (!lineItem.account_id) {
        await transaction.rollback();
        console.error(`Validation Error: Account ID is missing for line item ${i + 1}`);
        return res.status(400).json({
          success: false,
          message: `Account ID is required for line item ${i + 1} (item: ${item.itemCode || item.itemName})`
        });
      }
    }

    // Calculate totals
    const { subtotal, taxAmount, totalAmount } = calculateTotals(lineItems);

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Calculate due date from vendor payment terms if not provided
    let calculatedDueDate = dueDate ? new Date(dueDate) : null;
    if (!calculatedDueDate && vendor.paymentTerms) {
      const terms = vendor.paymentTerms.match(/\d+/);
      const days = terms ? parseInt(terms[0]) : 30;
      calculatedDueDate = new Date(invoiceDate);
      calculatedDueDate.setDate(calculatedDueDate.getDate() + days);
    } else if (!calculatedDueDate) {
      calculatedDueDate = new Date(invoiceDate);
      calculatedDueDate.setDate(calculatedDueDate.getDate() + 30);
    }

    // Create purchase invoice
    const purchaseInvoice = await PurchaseInvoice.create({
      invoiceNumber,
      vendorId,
      purchaseOrderId: purchaseOrderId || null,
      goodsReceiptId: goodsReceiptId || null,
      invoiceDate: new Date(invoiceDate),
      supplierInvoiceNumber: supplierInvoiceNumber || null,
      supplierInvoiceDate: supplierInvoiceDate ? new Date(supplierInvoiceDate) : null,
      dueDate: calculatedDueDate,
      lineItems,
      subtotal,
      taxAmount,
      totalAmount,
      notes,
      propertyId: propertyId || null,
      unitId: unitId || null,
      leaseId: leaseId || null,
      workOrderId: workOrderId || null,
      deliveryAddress: deliveryAddress || null,
      deliveryContactName: deliveryContactName || null,
      deliveryContactPhone: deliveryContactPhone || null,
      deliveryInstructions: deliveryInstructions || null,
      status: 'draft',
      paymentStatus: 'unpaid',
      createdBy: req.user.id
    }, { transaction });

    await transaction.commit();

    // Fetch created invoice with associations
    const createdInvoice = await PurchaseInvoice.findByPk(purchaseInvoice.id, {
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'vendorName', 'email', 'contactPerson']
        },
        {
          model: PurchaseOrder,
          as: 'purchaseOrder',
          attributes: ['id', 'poNumber'],
          required: false
        },
        {
          model: GoodsReceipt,
          as: 'goodsReceipt',
          attributes: ['id', 'grNumber'],
          required: false
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
      message: 'Purchase invoice created successfully',
      data: { purchaseInvoice: createdInvoice }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('=== ERROR CREATING PURCHASE INVOICE ===');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Request Body:', JSON.stringify(req.body, null, 2));
    next(error);
  }
};

/**
 * Update purchase invoice (only if draft)
 */
exports.updatePurchaseInvoice = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { 
      vendorId, 
      purchaseOrderId, 
      goodsReceiptId, 
      invoiceDate, 
      supplierInvoiceNumber,
      supplierInvoiceDate,
      dueDate, 
      lineItems, 
      notes, 
      status,
      propertyId,
      unitId,
      leaseId,
      workOrderId,
      deliveryAddress,
      deliveryContactName,
      deliveryContactPhone,
      deliveryInstructions
    } = req.body;

    const purchaseInvoice = await PurchaseInvoice.findByPk(id, { transaction });

    if (!purchaseInvoice) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Purchase invoice not found'
      });
    }

    // Allow status changes for any purchase invoice
    // But restrict other field changes if current status is not draft
    const isChangingOtherFields = vendorId !== undefined && vendorId !== purchaseInvoice.vendorId ||
                                  invoiceDate !== undefined && new Date(invoiceDate).toISOString().split('T')[0] !== new Date(purchaseInvoice.invoiceDate).toISOString().split('T')[0] ||
                                  supplierInvoiceNumber !== undefined && supplierInvoiceNumber !== purchaseInvoice.supplierInvoiceNumber ||
                                  supplierInvoiceDate !== undefined && (supplierInvoiceDate ? new Date(supplierInvoiceDate).toISOString().split('T')[0] : null) !== (purchaseInvoice.supplierInvoiceDate ? new Date(purchaseInvoice.supplierInvoiceDate).toISOString().split('T')[0] : null) ||
                                  dueDate !== undefined && (dueDate ? new Date(dueDate).toISOString().split('T')[0] : null) !== (purchaseInvoice.dueDate ? new Date(purchaseInvoice.dueDate).toISOString().split('T')[0] : null) ||
                                  lineItems !== undefined ||
                                  notes !== undefined && notes !== purchaseInvoice.notes ||
                                  purchaseOrderId !== undefined && purchaseOrderId !== purchaseInvoice.purchaseOrderId ||
                                  goodsReceiptId !== undefined && goodsReceiptId !== purchaseInvoice.goodsReceiptId ||
                                  propertyId !== undefined && propertyId !== purchaseInvoice.propertyId ||
                                  unitId !== undefined && unitId !== purchaseInvoice.unitId ||
                                  leaseId !== undefined && leaseId !== purchaseInvoice.leaseId ||
                                  workOrderId !== undefined && workOrderId !== purchaseInvoice.workOrderId ||
                                  deliveryAddress !== undefined && deliveryAddress !== purchaseInvoice.deliveryAddress ||
                                  deliveryContactName !== undefined && deliveryContactName !== purchaseInvoice.deliveryContactName ||
                                  deliveryContactPhone !== undefined && deliveryContactPhone !== purchaseInvoice.deliveryContactPhone ||
                                  deliveryInstructions !== undefined && deliveryInstructions !== purchaseInvoice.deliveryInstructions;
    const isChangingStatus = status && status !== purchaseInvoice.status;

    // If current status is not draft and trying to change fields other than status
    if (purchaseInvoice.status !== 'draft' && isChangingOtherFields && !isChangingStatus) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Can only update other fields when purchase invoice status is draft. Status can be changed at any time.'
      });
    }

    // If changing both status and other fields, and current status is not draft, only allow status change
    if (purchaseInvoice.status !== 'draft' && isChangingOtherFields && isChangingStatus) {
      console.log('Status change allowed, but other field changes will be ignored for non-draft invoice');
    }

    const updateData = {
      vendorId: vendorId !== undefined ? vendorId : purchaseInvoice.vendorId,
      purchaseOrderId: purchaseOrderId !== undefined ? purchaseOrderId : purchaseInvoice.purchaseOrderId,
      goodsReceiptId: goodsReceiptId !== undefined ? goodsReceiptId : purchaseInvoice.goodsReceiptId,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : purchaseInvoice.invoiceDate,
      supplierInvoiceNumber: supplierInvoiceNumber !== undefined ? (supplierInvoiceNumber || null) : purchaseInvoice.supplierInvoiceNumber,
      supplierInvoiceDate: supplierInvoiceDate ? new Date(supplierInvoiceDate) : (supplierInvoiceDate === null ? null : purchaseInvoice.supplierInvoiceDate),
      dueDate: dueDate ? new Date(dueDate) : purchaseInvoice.dueDate,
      notes: notes !== undefined ? notes : purchaseInvoice.notes,
      propertyId: propertyId !== undefined ? (propertyId || null) : purchaseInvoice.propertyId,
      unitId: unitId !== undefined ? (unitId || null) : purchaseInvoice.unitId,
      leaseId: leaseId !== undefined ? (leaseId || null) : purchaseInvoice.leaseId,
      workOrderId: workOrderId !== undefined ? (workOrderId || null) : purchaseInvoice.workOrderId,
      deliveryAddress: deliveryAddress !== undefined ? (deliveryAddress || null) : purchaseInvoice.deliveryAddress,
      deliveryContactName: deliveryContactName !== undefined ? (deliveryContactName || null) : purchaseInvoice.deliveryContactName,
      deliveryContactPhone: deliveryContactPhone !== undefined ? (deliveryContactPhone || null) : purchaseInvoice.deliveryContactPhone,
      deliveryInstructions: deliveryInstructions !== undefined ? (deliveryInstructions || null) : purchaseInvoice.deliveryInstructions
    };

    // If line items are being updated, recalculate totals
    if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
      // Validate items exist
      for (const lineItem of lineItems) {
        const item = await Item.findOne({
          where: { id: lineItem.item_id, isActive: true },
          transaction
        });
        if (!item) {
          await transaction.rollback();
          return res.status(404).json({
            success: false,
            message: `Item with ID ${lineItem.item_id} not found`
          });
        }
        if (!lineItem.account_id) {
          lineItem.account_id = item.accountId;
        }
      }

      const { subtotal, taxAmount, totalAmount } = calculateTotals(lineItems);
      updateData.lineItems = lineItems;
      updateData.subtotal = subtotal;
      updateData.taxAmount = taxAmount;
      updateData.totalAmount = totalAmount;
    }

    if (status) {
      updateData.status = status;
    }

    // Only update other fields if status is draft or if only status is changing
    if (purchaseInvoice.status === 'draft' || !isChangingOtherFields) {
      await purchaseInvoice.update(updateData, { transaction });
    } else {
      // Only update status
      await purchaseInvoice.update({ status }, { transaction });
    }

    await transaction.commit();

    // Fetch updated invoice with associations
    const updatedInvoice = await PurchaseInvoice.findByPk(purchaseInvoice.id, {
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'vendorName', 'email', 'contactPerson']
        },
        {
          model: PurchaseOrder,
          as: 'purchaseOrder',
          attributes: ['id', 'poNumber'],
          required: false
        },
        {
          model: GoodsReceipt,
          as: 'goodsReceipt',
          attributes: ['id', 'grNumber'],
          required: false
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
      message: 'Purchase invoice updated successfully',
      data: { purchaseInvoice: updatedInvoice }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Approve purchase invoice and create accounting entries
 */
exports.approvePurchaseInvoice = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    console.log('=== APPROVE PURCHASE INVOICE ===');
    console.log('Invoice ID:', id);
    console.log('User ID:', req.user?.id);
    console.log('User object:', req.user);

    if (!req.user || !req.user.id) {
      await transaction.rollback();
      console.error('User not authenticated');
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const purchaseInvoice = await PurchaseInvoice.findByPk(id, { transaction });

    if (!purchaseInvoice) {
      await transaction.rollback();
      console.error('Purchase invoice not found:', id);
      return res.status(404).json({
        success: false,
        message: 'Purchase invoice not found'
      });
    }

    console.log('Purchase Invoice Status:', purchaseInvoice.status);

    if (purchaseInvoice.status === 'approved') {
      await transaction.rollback();
      console.error('Purchase invoice already approved');
      return res.status(400).json({
        success: false,
        message: 'Purchase invoice is already approved'
      });
    }

    if (purchaseInvoice.status === 'cancelled') {
      await transaction.rollback();
      console.error('Cannot approve cancelled purchase invoice');
      return res.status(400).json({
        success: false,
        message: 'Cannot approve a cancelled purchase invoice'
      });
    }

    // Post accounting entries
    const entries = await postAccountingEntries(purchaseInvoice, transaction);

    // Update invoice status
    await purchaseInvoice.update({
      status: 'approved',
      approvedBy: req.user.id,
      approvedAt: new Date()
    }, { transaction });

    await transaction.commit();

    // Fetch updated invoice with associations
    const updatedInvoice = await PurchaseInvoice.findByPk(purchaseInvoice.id, {
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'vendorName', 'email', 'contactPerson']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Purchase invoice approved and accounting entries posted successfully',
      data: {
        purchaseInvoice: updatedInvoice,
        accountingEntries: entries.length
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('=== ERROR APPROVING PURCHASE INVOICE ===');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    next(error);
  }
};

/**
 * Cancel purchase invoice and reverse accounting entries
 */
exports.cancelPurchaseInvoice = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const purchaseInvoice = await PurchaseInvoice.findByPk(id, { transaction });

    if (!purchaseInvoice) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Purchase invoice not found'
      });
    }

    // If approved, reverse accounting entries
    if (purchaseInvoice.status === 'approved') {
      await reverseAccountingEntries(purchaseInvoice, transaction);
    }

    // Update invoice status
    await purchaseInvoice.update({ status: 'cancelled' }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Purchase invoice cancelled successfully'
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};
