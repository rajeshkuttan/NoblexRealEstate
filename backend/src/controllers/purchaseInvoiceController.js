/**
 * Purchase Invoice Controller
 * Handles Purchase Invoice operations with accounting integration
 */

const { PurchaseInvoice, Vendor, PurchaseOrder, GoodsReceipt, Item, ChartOfAccount, FinancialTransaction, User, Property, Unit, Lease, sequelize } = require('../models');
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');
const documentNumberingService = require('../services/documentNumberingService');

/**
 * Generate unique invoice number
 */
async function generateInvoiceNumber(transaction) {
  const generatedNumber = await documentNumberingService.generateDocumentNumber('Purchase Invoice', transaction);
  if (generatedNumber) {
    return generatedNumber;
  }

  const year = new Date().getFullYear();
  const count = await PurchaseInvoice.count({ transaction });
  const number = `PI-${year}-${String(count + 1).padStart(4, '0')}`;
  
  const exists = await PurchaseInvoice.findOne({ where: { invoiceNumber: number }, transaction });
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
function calculateTotals(lineItems, discountType = 'amount', discountValue = 0) {
  // 1. Calculate Raw Subtotal (Sum of Gross Amounts)
  let rawSubtotal = 0;
  lineItems.forEach(item => {
    // Ensure we use the raw quantity * price, ignoring any pre-existing 'total' or 'discount' properties
    // that might be lingering on the object if it came from frontend with old logic
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    rawSubtotal += qty * price;
  });

  // 2. Calculate Global Discount Amount
  let globalDiscountAmount = 0;
  const numericDiscountValue = parseFloat(discountValue) || 0;
  
  if (discountType === 'percentage') {
    globalDiscountAmount = (rawSubtotal * numericDiscountValue) / 100;
  } else {
    globalDiscountAmount = numericDiscountValue;
  }
  
  // Ensure discount doesn't exceed subtotal
  globalDiscountAmount = Math.min(globalDiscountAmount, rawSubtotal);

  let subtotal = 0; // This will accumulate the Taxable Amount (Net of Discount)
  let taxAmount = 0;
  
  // 3. Prorate Discount to Items & Calculate Tax
  lineItems.forEach(item => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    const itemGross = qty * price;
    
    // Calculate weight for proration
    const weight = rawSubtotal > 0 ? (itemGross / rawSubtotal) : 0;
    const itemDiscount = globalDiscountAmount * weight;
    const itemTaxable = itemGross - itemDiscount;
    
    // Update item total to reflect Net Amount (Taxable Base)
    // This ensures that when we sum item.total, we get (RawSubtotal - GlobalDiscount)
    item.total = itemTaxable;
    // We can also store the allocated discount if useful for debugging/UI
    item.discount_amount = itemDiscount; 
    
    subtotal += itemTaxable;
    
    // Calculate tax based on UAE FTA classification
    const classification = item.tax_classification || 'Standard-Rated';
    let itemTax = 0;
    let itemTaxPercent = 0;
    
    if (classification === 'Standard-Rated' || classification === 'Standard-Rated (5%)') {
      itemTaxPercent = parseFloat(item.tax_percent) || 5; // Default 5% for UAE
      itemTax = (itemTaxable * itemTaxPercent) / 100;
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
      itemTax = (itemTaxable * itemTaxPercent) / 100;
      
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
  
  // Final Total = (RawSubtotal - Discount) + Tax
  // Which is equal to Sum(ItemTaxable) + Sum(ItemTax)
  const totalAmount = subtotal + taxAmount;
  
  return { subtotal, taxAmount, totalAmount, discountAmount: globalDiscountAmount };
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

  // Fetch Payable Account from LedgerSetup
  const payableSetup = await sequelize.models.LedgerSetup.findOne({
    where: {
      documentType: 'Purchase Invoice',
      schema: { [Op.or]: [{ amountType: 'Cr' }, { subDocument: { [Op.ne]: null } }] } // Simplified for real estate app or use exact match if configured
    },
    include: [{ model: ChartOfAccount, as: 'ledger' }],
    transaction
  });
  
  // Try finding exactly what is requested (Purchase Invoice - Cr)
  let exactPayableSetup = await sequelize.models.LedgerSetup.findOne({
     where: { documentType: 'Purchase Invoice', amountType: 'Cr' },
     include: [{ model: ChartOfAccount, as: 'ledger' }],
     transaction
  });

  // Fallback to legacy creation if not mapped strictly to prevent total breakage
  let apAccountId;
  if (exactPayableSetup && exactPayableSetup.ledger) {
      apAccountId = exactPayableSetup.ledger.id;
  } else {
     // Check if accounts payable liability exists
     const apAccount = await getOrCreateAPAccount(purchaseInvoice.vendorId, vendor.vendorName, transaction);
     apAccountId = apAccount.id;
  }

  // Fetch Tax Account from LedgerSetup
  let taxAccountId = null;
  const taxSetup = await sequelize.models.LedgerSetup.findOne({
    where: { documentType: 'Purchase Invoice', calculationOn: 'Tax' }, // Assuming calculationOn 'Tax' or similar differentiates tax
    include: [{ model: ChartOfAccount, as: 'ledger' }],
    transaction
  });
  
  if (taxSetup && taxSetup.ledger) {
      taxAccountId = taxSetup.ledger.id;
  } else {
     // Fallback to searching for VAT account if not explicitly mapped
     const vatAccount = await ChartOfAccount.findOne({
         where: { accountName: { [Op.substring]: 'VAT' }, accountType: 'liability' },
         transaction
     });
     if (vatAccount) taxAccountId = vatAccount.id;
  }

  // Calculate totals to ensure balancing before creating entries
  let totalDebit = 0;
  let totalCredit = 0;

  const transactionDate = new Date(purchaseInvoice.invoiceDate);
  const entries = [];
  
  // Prepare transaction numbers
  // Needs 1 per item + 1 for tax + 1 for payable credit
  const totalTransactionsNeeded = lineItems.length + 2; 
  const transactionNumbers = [];
  for (let i = 0; i < totalTransactionsNeeded; i++) {
    const txnNumber = await generateTransactionNumber(transaction);
    transactionNumbers.push(txnNumber);
  }
  let txnNumberIndex = 0;

  // 1. Create debit entries for each line item (item account)
  for (const lineItem of lineItems) {
    if (!lineItem.item_id) continue;
    
    // Use account_id from line item (mapped from Item Master on frontend or during create)
    const accountId = lineItem.account_id;
    if (!accountId) {
      throw new Error(`Account mapping missing for item ID: ${lineItem.item_id} in Item Master`);
    }

    const amount = parseFloat(lineItem.subtotal || lineItem.total) || 0; // Use subtotal (pre-tax taxable amount net of discount)
    if (amount > 0) {
      totalDebit += amount;
      
      const txnNumber = transactionNumbers[txnNumberIndex++];
      const debitEntry = await FinancialTransaction.create({
        transactionNumber: txnNumber,
        transactionDate,
        description: `Purchase Invoice ${purchaseInvoice.invoiceNumber} - Item`,
        reference: purchaseInvoice.invoiceNumber,
        amount,
        currency: 'AED',
        transactionType: 'debit',
        accountId: accountId,
        category: 'other',
        status: 'approved',
        vendorId: purchaseInvoice.vendorId,
        createdBy: purchaseInvoice.createdBy || null,
        approvedBy: purchaseInvoice.approvedBy || null,
        approvedAt: new Date()
      }, { transaction });

      // Update account balance
      await ChartOfAccount.increment('balance', { by: amount, where: { id: accountId }, transaction });
      entries.push(debitEntry);
    }
  }

  // 2. Debit Entry - Tax Account
  const totalTaxAmount = parseFloat(purchaseInvoice.taxAmount) || 0;
  if (totalTaxAmount > 0) {
      if (!taxAccountId) {
          throw new Error('Tax Account mapping is not configured in Ledger Setup or Chart of Accounts.');
      }
      
      totalDebit += totalTaxAmount;
      const txnNumber = transactionNumbers[txnNumberIndex++];
      const taxEntry = await FinancialTransaction.create({
        transactionNumber: txnNumber,
        transactionDate,
        description: `Purchase Invoice ${purchaseInvoice.invoiceNumber} - Input VAT`,
        reference: purchaseInvoice.invoiceNumber,
        amount: totalTaxAmount,
        currency: 'AED',
        transactionType: 'debit',
        accountId: taxAccountId,
        category: 'other',
        status: 'approved',
        vendorId: purchaseInvoice.vendorId,
        createdBy: purchaseInvoice.createdBy || null,
        approvedBy: purchaseInvoice.approvedBy || null,
        approvedAt: new Date()
      }, { transaction });

      await ChartOfAccount.increment('balance', { by: totalTaxAmount, where: { id: taxAccountId }, transaction });
      entries.push(taxEntry);
  }

  // 3. Create credit entry for AP account (total amount)
  const totalAmount = parseFloat(purchaseInvoice.totalAmount) || 0;
  if (totalAmount > 0) {
    if (!apAccountId) {
        throw new Error('Payable Account mapping is not configured in Ledger Setup.');
    }
    
    totalCredit += totalAmount;
    
    // Balance validation
    // Due to precision, checking variance less than 0.01 instead of exact equality
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error(`Accounting entries are unbalanced. Debit: ${totalDebit.toFixed(2)}, Credit: ${totalCredit.toFixed(2)}`);
    }

    const txnNumber = transactionNumbers[txnNumberIndex++];
    const creditEntry = await FinancialTransaction.create({
      transactionNumber: txnNumber,
      transactionDate,
      description: `Purchase Invoice ${purchaseInvoice.invoiceNumber} - ${vendor.vendorName}`,
      reference: purchaseInvoice.invoiceNumber,
      amount: totalAmount,
      currency: 'AED',
      transactionType: 'credit',
      accountId: apAccountId,
      category: 'other',
      status: 'approved',
      vendorId: purchaseInvoice.vendorId,
      createdBy: purchaseInvoice.createdBy,
      approvedBy: purchaseInvoice.approvedBy,
      approvedAt: new Date()
    }, { transaction });

    await ChartOfAccount.increment('balance', { by: totalAmount, where: { id: apAccountId }, transaction });
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
            account: item?.account || null,
            accountName: item?.account ? `${item.account.accountCode} - ${item.account.accountName}` : lineItem.accountName
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
      goodsReceiptIds,
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

      deliveryInstructions,
      status,
      discountType,
      discountValue
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

    // Validate GR if provided (support both singular and plural)
    let validGoodsReceiptId = null;
    let validGoodsReceiptIds = [];

    if (goodsReceiptIds && Array.isArray(goodsReceiptIds) && goodsReceiptIds.length > 0) {
       validGoodsReceiptIds = goodsReceiptIds;
       validGoodsReceiptId = goodsReceiptIds[0]; // Set primary GR for legacy support
       
       // Verify all GRs exist
       for (const grId of goodsReceiptIds) {
          const gr = await GoodsReceipt.findByPk(grId, { transaction });
          if (!gr) {
            await transaction.rollback();
            return res.status(404).json({
              success: false,
              message: `Goods receipt with ID ${grId} not found`
            });
          }
       }
    } else if (goodsReceiptId) {
      const gr = await GoodsReceipt.findByPk(goodsReceiptId, { transaction });
      if (!gr) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Goods receipt not found'
        });
      }
      validGoodsReceiptId = goodsReceiptId;
      validGoodsReceiptIds = [goodsReceiptId.toString()];
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
    const { subtotal, taxAmount, totalAmount } = calculateTotals(lineItems, discountType, discountValue);

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(transaction);

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
      goodsReceiptId: validGoodsReceiptId || null,
      goodsReceiptIds: validGoodsReceiptIds,
      invoiceDate: new Date(invoiceDate),
      supplierInvoiceNumber: supplierInvoiceNumber || null,
      supplierInvoiceDate: supplierInvoiceDate ? new Date(supplierInvoiceDate) : null,
      dueDate: calculatedDueDate,
      lineItems,
      subtotal,
      taxAmount,
      totalAmount,
      discountType: discountType || 'amount',
      discountValue: discountValue || 0,
      notes,
      propertyId: propertyId || null,
      unitId: unitId || null,
      leaseId: leaseId || null,
      workOrderId: workOrderId || null,
      deliveryAddress: deliveryAddress || null,
      deliveryContactName: deliveryContactName || null,
      deliveryContactPhone: deliveryContactPhone || null,
      deliveryInstructions: deliveryInstructions || null,

      status: status || 'draft',
      paymentStatus: 'unpaid',
      createdBy: req.user.id,
      approvedBy: status === 'approved' ? req.user.id : null,
      approvedAt: status === 'approved' ? new Date() : null
    }, { transaction });

    // If creating as approved, post accounting entries
    if (status === 'approved') {
      await postAccountingEntries(purchaseInvoice, transaction);
    }

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
      goodsReceiptIds,
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
      deliveryInstructions,
      discountType,
      discountValue
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
                              goodsReceiptIds !== undefined && JSON.stringify(goodsReceiptIds) !== JSON.stringify(purchaseInvoice.goodsReceiptIds) ||
                              propertyId !== undefined && propertyId !== purchaseInvoice.propertyId ||
                                  unitId !== undefined && unitId !== purchaseInvoice.unitId ||
                                  leaseId !== undefined && leaseId !== purchaseInvoice.leaseId ||
                                  workOrderId !== undefined && workOrderId !== purchaseInvoice.workOrderId ||
                                  deliveryAddress !== undefined && deliveryAddress !== purchaseInvoice.deliveryAddress ||
                                  deliveryContactName !== undefined && deliveryContactName !== purchaseInvoice.deliveryContactName ||
                                  deliveryContactPhone !== undefined && deliveryContactPhone !== purchaseInvoice.deliveryContactPhone ||
                                  deliveryInstructions !== undefined && deliveryInstructions !== purchaseInvoice.deliveryInstructions ||
                                  discountType !== undefined && discountType !== purchaseInvoice.discountType ||
                                  discountValue !== undefined && parseFloat(discountValue) !== parseFloat(purchaseInvoice.discountValue);
    const isChangingStatus = status && status !== purchaseInvoice.status;

    // If current status is not draft or pending_approval and trying to change fields other than status
    if (!['draft', 'pending_approval'].includes(purchaseInvoice.status) && isChangingOtherFields && !isChangingStatus) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Can only update other fields when purchase invoice status is draft or pending approval. Status can be changed at any time.'
      });
    }

    // If changing both status and other fields, and current status is restricted, only allow status change
    if (!['draft', 'pending_approval'].includes(purchaseInvoice.status) && isChangingOtherFields && isChangingStatus) {
      console.log('Status change allowed, but other field changes will be ignored for non-draft invoice');
    }

    // Validate GR if provided for update
    let validGoodsReceiptId = purchaseInvoice.goodsReceiptId;
    let validGoodsReceiptIds = purchaseInvoice.goodsReceiptIds;

    if (goodsReceiptIds !== undefined) { // Check if field is present in update request
        if (Array.isArray(goodsReceiptIds) && goodsReceiptIds.length > 0) {
           validGoodsReceiptIds = goodsReceiptIds;
           validGoodsReceiptId = goodsReceiptIds[0];
           
           for (const grId of goodsReceiptIds) {
              const gr = await GoodsReceipt.findByPk(grId, { transaction });
              if (!gr) {
                await transaction.rollback();
                return res.status(404).json({
                  success: false,
                  message: `Goods receipt with ID ${grId} not found`
                });
              }
           }
        } else {
            // Clearing GRs
            validGoodsReceiptIds = [];
            validGoodsReceiptId = null;
        }
    } else if (goodsReceiptId !== undefined) {
         // Legacy update support
        if (goodsReceiptId) {
            const gr = await GoodsReceipt.findByPk(goodsReceiptId, { transaction });
            if (!gr) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Goods receipt not found'
                });
            }
            validGoodsReceiptId = goodsReceiptId;
            validGoodsReceiptIds = [goodsReceiptId.toString()];
        } else {
            validGoodsReceiptId = null;
            validGoodsReceiptIds = [];
        }
    }

    const updateData = {
      vendorId: vendorId !== undefined ? vendorId : purchaseInvoice.vendorId,
      purchaseOrderId: purchaseOrderId !== undefined ? purchaseOrderId : purchaseInvoice.purchaseOrderId,
      goodsReceiptId: validGoodsReceiptId,
      goodsReceiptIds: validGoodsReceiptIds,
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
      deliveryInstructions: deliveryInstructions !== undefined ? (deliveryInstructions || null) : purchaseInvoice.deliveryInstructions,
      discountType: discountType !== undefined ? discountType : purchaseInvoice.discountType,
      discountValue: discountValue !== undefined ? discountValue : purchaseInvoice.discountValue
    };

    // If line items are being updated, recalculate totals
    // If line items OR discount fields are being updated, recalculate totals
    const isDiscountChanging = discountType !== undefined || discountValue !== undefined;
    
    if ((lineItems && Array.isArray(lineItems) && lineItems.length > 0) || isDiscountChanging) {
       let itemsToCalculate = [];
       
       if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
          // Use new line items
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
          itemsToCalculate = lineItems;
          updateData.lineItems = lineItems;
       } else {
          // Use existing line items
          itemsToCalculate = purchaseInvoice.lineItems;
          // Ensure they are in the correct format (if stored as JSON string/array)
            if (typeof itemsToCalculate === 'string') {
                try {
                    itemsToCalculate = JSON.parse(itemsToCalculate);
                } catch (e) {
                    itemsToCalculate = [];
                }
            }
       }

      const { subtotal, taxAmount, totalAmount } = calculateTotals(
        itemsToCalculate, 
        discountType !== undefined ? discountType : (purchaseInvoice.discountType || 'amount'), 
        discountValue !== undefined ? discountValue : (purchaseInvoice.discountValue || 0)
      );
      
      updateData.subtotal = subtotal;
      updateData.taxAmount = taxAmount;
      updateData.totalAmount = totalAmount;
    }

    if (status) {
      updateData.status = status;
    }

    // Only update other fields if status is editable or if only status is changing
    if (['draft', 'pending_approval'].includes(purchaseInvoice.status) || !isChangingOtherFields) {
      // If status is changing to approved, set approval details and post entries
      if (status === 'approved' && purchaseInvoice.status !== 'approved') {
        updateData.approvedBy = req.user.id;
        updateData.approvedAt = new Date();
        await postAccountingEntries(purchaseInvoice, transaction);
      }
      
      // If status is changing to cancelled, reverse entries
      if (status === 'cancelled' && purchaseInvoice.status === 'approved') {
        await reverseAccountingEntries(purchaseInvoice, transaction);
      }

      await purchaseInvoice.update(updateData, { transaction });
    } else {
      // Only update status
      const statusUpdateData = { status };
      
      if (status === 'approved' && purchaseInvoice.status !== 'approved') {
        statusUpdateData.approvedBy = req.user.id;
        statusUpdateData.approvedAt = new Date();
        await postAccountingEntries(purchaseInvoice, transaction);
      }

      if (status === 'cancelled' && purchaseInvoice.status === 'approved') {
        await reverseAccountingEntries(purchaseInvoice, transaction);
      }

      await purchaseInvoice.update(statusUpdateData, { transaction });
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

    // NOTE: Accounting entries are now posted via a separate POST action rather than upon Approval
    // to align with the new Post/Unpost workflows.
    // const entries = await postAccountingEntries(purchaseInvoice, transaction);

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
      message: 'Purchase invoice approved successfully',
      data: {
        purchaseInvoice: updatedInvoice
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

exports.postPurchaseInvoice = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    if (!req.user || !req.user.id) {
      await transaction.rollback();
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { id } = req.params;
    const purchaseInvoice = await PurchaseInvoice.findByPk(id, { transaction });

    if (!purchaseInvoice) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Purchase invoice not found' });
    }

    if (purchaseInvoice.isPosted) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Purchase invoice is already posted' });
    }
    
    if (purchaseInvoice.status !== 'approved' && purchaseInvoice.status !== 'paid') {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Only approved invoices can be posted' });
    }

    // Post accounting entries
    const entries = await postAccountingEntries(purchaseInvoice, transaction);

    await purchaseInvoice.update({
      isPosted: true
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Purchase invoice posted successfully',
      data: {
        accountingEntries: entries.length
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('=== ERROR POSTING PURCHASE INVOICE ===');
    console.error(error);
    next(error);
  }
};

/**
 * Unpost purchase invoice
 */
exports.unpostPurchaseInvoice = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    if (!req.user || !req.user.id) {
      await transaction.rollback();
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { id } = req.params;
    const purchaseInvoice = await PurchaseInvoice.findByPk(id, { transaction });

    if (!purchaseInvoice) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Purchase invoice not found' });
    }

    if (!purchaseInvoice.isPosted) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Purchase invoice is not posted' });
    }
    
    if (purchaseInvoice.status === 'paid' || purchaseInvoice.paymentStatus === 'paid') {
       await transaction.rollback();
       return res.status(400).json({ success: false, message: 'Cannot unpost an invoice that has been paid' });
    }

    // Reverse accounting entries
    await reverseAccountingEntries(purchaseInvoice, transaction);

    await purchaseInvoice.update({
      isPosted: false
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Purchase invoice unposted successfully'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('=== ERROR UNPOSTING PURCHASE INVOICE ===');
    console.error(error);
    next(error);
  }
};

/**
 * Sync DB for PurchaseInvoice model
 */
exports.syncDB = async (req, res, next) => {
  try {
    await PurchaseInvoice.sync({ alter: true });
    res.json({ success: true, message: 'Database synced for PurchaseInvoice' });
  } catch (error) {
    console.error(error);
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

    // If posted, reverse accounting entries
    if (purchaseInvoice.isPosted) {
      await reverseAccountingEntries(purchaseInvoice, transaction);
      await purchaseInvoice.update({ isPosted: false }, { transaction });
    }

    // Update status to cancelled
    await purchaseInvoice.update({
      status: 'cancelled',
      paymentStatus: 'unpaid'
    }, { transaction });

    await transaction.commit();

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
/**
 * Get purchase invoice statistics
 */
exports.getInvoiceStats = async (req, res, next) => {
  try {
    // Total invoices by status
    const invoicesByStatus = await PurchaseInvoice.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'amount']
      ],
      group: ['status'],
      raw: true
    });

    // Total invoices by payment status
    const invoicesByPaymentStatus = await PurchaseInvoice.findAll({
      attributes: [
        [sequelize.col('payment_status'), 'paymentStatus'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'amount']
      ],
      group: ['payment_status'],
      raw: true
    });

    // Monthly invoice trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await PurchaseInvoice.findAll({
      where: {
        invoiceDate: { [Op.gte]: sixMonthsAgo }
      },
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('invoice_date'), '%Y-%m'), 'month'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'amount']
      ],
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('invoice_date'), '%Y-%m')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('invoice_date'), '%Y-%m'), 'ASC']],
      raw: true
    });

    // Calculate summary statistics from the arrays
    const totalInvoices = invoicesByPaymentStatus.reduce((sum, item) => sum + parseInt(item.count), 0);
    const totalAmount = invoicesByPaymentStatus.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    // Note: Payment statuses might differ slightly, adjust as needed. 
    // Usually 'unpaid', 'partially_paid', 'paid'. 'overdue' might be a derived state or a specific status.
    // In PurchaseInvoice model, we set default to 'unpaid'.
    
    const unpaidData = invoicesByPaymentStatus.find(item => item.paymentStatus === 'unpaid') || { count: 0, amount: 0 };
    // For overdue, we might need to check due dates if it's not a status in DB. 
    // However, vendorInvoiceController assumes it's a paymentStatus. 
    // Let's stick to what's in the DB. If 'overdue' isn't a stored status, this will return 0.
    // If we need to calculate overdue dynamically, we'd need a separate query.
    // For now, mirroring vendor invoice logic.
    const overdueData = invoicesByPaymentStatus.find(item => item.paymentStatus === 'overdue') || { count: 0, amount: 0 };
    const paidData = invoicesByPaymentStatus.find(item => item.paymentStatus === 'paid') || { count: 0, amount: 0 };

    // If 'overdue' is NOT a stored status, we should calculate it dynamically.
    // Let's add that check to be safe, filtering for unpaid/partially_paid + dueDate < now.
    const overdueStats = await PurchaseInvoice.findOne({
        where: {
            paymentStatus: { [Op.in]: ['unpaid', 'partially_paid'] },
            dueDate: { [Op.lt]: new Date() }
        },
        attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
            [sequelize.fn('SUM', sequelize.col('total_amount')), 'amount']
        ],
        raw: true
    });

    const calculatedOverdueCount = parseInt(overdueStats?.count || 0);
    const calculatedOverdueAmount = parseFloat(overdueStats?.amount || 0);

    // If paymentStatus 'overdue' exists, use it, otherwise use calculated.
    // Actually, 'overdue' is usually a derived status for display, but sometimes stored.
    // We will prefer the stored 'overdue' if present, else calculated.
    const finalOverdueCount = overdueData.count > 0 ? parseInt(overdueData.count) : calculatedOverdueCount;
    const finalOverdueAmount = overdueData.amount > 0 ? parseFloat(overdueData.amount) : calculatedOverdueAmount;


    res.status(200).json({
      success: true,
      data: {
        // Summary values for cards
        totalInvoices,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        unpaidAmount: parseFloat(unpaidData.amount || 0),
        unpaidCount: parseInt(unpaidData.count || 0),
        overdueAmount: parseFloat(finalOverdueAmount.toFixed(2)),
        overdueCount: finalOverdueCount,
        paidAmount: parseFloat(paidData.amount || 0),
        paidCount: parseInt(paidData.count || 0),
        // Detailed arrays
        invoicesByStatus,
        invoicesByPaymentStatus,
        monthlyTrends
      }
    });

  } catch (error) {
    console.error('Get purchase invoice stats error:', error);
    next(error);
  }
};
