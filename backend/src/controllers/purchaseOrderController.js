/**
 * Purchase Order Controller
 * Handles Purchase Order operations for Procurement Module
 */

const { PurchaseOrder, Vendor, User, Item, Property, Unit, Lease, sequelize } = require('../models');
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');
const documentNumberingService = require('../services/documentNumberingService');

/**
 * Generate unique PO number
 */
async function generatePONumber(transaction, context = {}) {
  const generatedNumber = await documentNumberingService.generateDocumentNumber('Purchase Order', transaction, context);
  if (generatedNumber) {
    return generatedNumber;
  }

  const manualNumber = documentNumberingService.normalizeManualDocumentNumber(context.manualNumber);
  if (!manualNumber) {
    const error = new Error('Document numbering is disabled for Purchase Order. Please enter the PO number manually.');
    error.statusCode = 400;
    throw error;
  }

  const exists = await PurchaseOrder.findOne({ where: { poNumber: manualNumber }, transaction });
  if (exists) {
    const error = new Error(`Purchase Order number '${manualNumber}' already exists.`);
    error.statusCode = 400;
    throw error;
  }

  return manualNumber;
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
    
    if (classification === 'Standard-Rated') {
      itemTaxPercent = parseFloat(item.tax_percent) || 5; // Default 5% for UAE
      itemTax = (itemSubtotal * itemTaxPercent) / 100;
      item.taxable = true;
    } else if (classification === 'Zero-Rated') {
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
        item.tax_classification = isTaxable ? 'Standard-Rated' : 'Exempt';
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
 * Get all purchase orders with filters and pagination
 */
exports.getAllPurchaseOrders = async (req, res, next) => {
  try {
    const { search, vendorId, status, startDate, endDate, propertyId, unitId, leaseId } = req.query;
    const { page, limit, offset } = normalizePagination(req.query, 10, 500);

    const whereClause = {};

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { poNumber: { [Op.like]: `%${search}%` } }
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

    // Date range filter
    if (startDate && endDate) {
      whereClause.poDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereClause.poDate = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereClause.poDate = {
        [Op.lte]: new Date(endDate)
      };
    }

    const { count, rows: purchaseOrders } = await PurchaseOrder.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'vendorName', 'email', 'contactPerson']
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
        purchaseOrders,
        pagination: createPaginationMeta(count, page, limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get purchase order by ID
 */
exports.getPurchaseOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid purchase order ID'
      });
    }

    const purchaseOrder = await PurchaseOrder.findByPk(parseInt(id), {
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'vendorName', 'email', 'contactPerson', 'paymentTerms'],
          required: false
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'location', 'emirate', 'community'],
          required: false
        },
        {
          model: Unit,
          as: 'unit',
          attributes: ['id', 'unitNumber', 'type', 'floor'],
          required: false
        },
        {
          model: Lease,
          as: 'lease',
          attributes: ['id', 'leaseNumber', 'startDate', 'endDate'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    // Parse lineItems if it's a string (some databases return JSON as string)
    let lineItems = purchaseOrder.lineItems || [];
    if (typeof lineItems === 'string') {
      try {
        lineItems = JSON.parse(lineItems);
      } catch (parseError) {
        console.error('Error parsing lineItems JSON:', parseError);
        lineItems = [];
      }
    }

    // Ensure lineItems is an array
    if (!Array.isArray(lineItems)) {
      lineItems = [];
    }

    // Fetch all completed Goods Receipts for this PO to calculate received quantities
    const goodsReceipts = await require('../models').GoodsReceipt.findAll({
      where: {
        purchaseOrderId: id,
        status: 'completed'
      },
      attributes: ['lineItems']
    });

    const receivedQuantities = {};
    goodsReceipts.forEach(gr => {
      let grLineItems = gr.lineItems || [];
      if (typeof grLineItems === 'string') {
        try {
          grLineItems = JSON.parse(grLineItems);
        } catch (e) {
          grLineItems = [];
        }
      }
      if (Array.isArray(grLineItems)) {
        grLineItems.forEach(item => {
          const itemId = item.item_id;
          const qty = parseFloat(item.received_qty) || 0;
          receivedQuantities[itemId] = (receivedQuantities[itemId] || 0) + qty;
        });
      }
    });

    // Enrich line items with item details and received quantities
    const enrichedLineItems = await Promise.all(
      lineItems.map(async (lineItem) => {
        try {
          if (!lineItem || !lineItem.item_id) {
            return {
              ...lineItem,
              item: null,
              received_qty: 0,
              pending_qty: 0
            };
          }
          
          const item = await Item.findByPk(lineItem.item_id, {
            attributes: ['id', 'itemCode', 'itemName', 'itemCategory', 'unitOfMeasure']
          });

          const orderedQty = parseFloat(lineItem.quantity) || 0;
          const receivedQty = receivedQuantities[lineItem.item_id] || 0;
          const pendingQty = Math.max(0, orderedQty - receivedQty);
          
          return {
            ...lineItem,
            item: item ? item.toJSON() : null,
            received_qty: receivedQty,
            pending_qty: pendingQty
          };
        } catch (itemError) {
          console.error(`Error fetching item ${lineItem?.item_id}:`, itemError);
          return {
            ...lineItem,
            item: null,
            received_qty: 0,
            pending_qty: 0
          };
        }
      })
    );

    const poData = purchaseOrder.toJSON();
    poData.lineItems = enrichedLineItems;

    res.json({
      success: true,
      data: {
        purchaseOrder: poData
      }
    });
  } catch (error) {
    console.error('Error in getPurchaseOrderById:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create new purchase order
 */
exports.createPurchaseOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { 
      vendorId, 
      poDate, 
      expectedDeliveryDate, 
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
      poNumber: rawPONumber
    } = req.body;

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

    // Validate line items
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one line item is required'
      });
    }

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
    }

    // Calculate totals
    const { subtotal, taxAmount, totalAmount } = calculateTotals(lineItems);

    // Generate PO number
    const poNumber = await generatePONumber(transaction, {
      propertyId,
      unitId,
      leaseId,
      manualNumber: rawPONumber
    });

    // Create purchase order
    const purchaseOrder = await PurchaseOrder.create({
      poNumber,
      vendorId,
      poDate: new Date(poDate),
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
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
      status: status || 'draft',
      createdBy: req.user.id
    }, { transaction });

    await transaction.commit();

    // Fetch created PO with associations
    const createdPO = await PurchaseOrder.findByPk(purchaseOrder.id, {
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'vendorName', 'email', 'contactPerson']
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
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: { purchaseOrder: createdPO }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Update purchase order (only if draft)
 */
exports.updatePurchaseOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { 
      vendorId, 
      poDate, 
      expectedDeliveryDate, 
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

    const purchaseOrder = await PurchaseOrder.findByPk(id, { transaction });

    if (!purchaseOrder) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    // Allow status changes for any purchase order
    // But restrict other field changes if current status is not draft
    const isChangingVendor = vendorId !== undefined && vendorId !== purchaseOrder.vendorId;
    const isChangingPODate = poDate !== undefined && new Date(poDate).toDateString() !== new Date(purchaseOrder.poDate).toDateString();
    const isChangingDeliveryDate = expectedDeliveryDate !== undefined && 
      ((expectedDeliveryDate && new Date(expectedDeliveryDate).toDateString() !== (purchaseOrder.expectedDeliveryDate ? new Date(purchaseOrder.expectedDeliveryDate).toDateString() : '')) ||
       (!expectedDeliveryDate && purchaseOrder.expectedDeliveryDate));
    const isChangingLineItems = lineItems !== undefined && Array.isArray(lineItems) && lineItems.length > 0;
    const isChangingNotes = notes !== undefined && notes !== purchaseOrder.notes;
    
    const isChangingOtherFields = isChangingVendor || isChangingPODate || isChangingDeliveryDate || isChangingLineItems || isChangingNotes;
    const isChangingStatus = status && status !== purchaseOrder.status;
    
    // If current status is not draft and trying to change fields other than status
    if (purchaseOrder.status !== 'draft' && isChangingOtherFields && !isChangingStatus) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Can only update other fields when purchase order status is draft. Status can be changed at any time.'
      });
    }
    
    // If changing both status and other fields, and current status is not draft
    // Allow status change but restrict other field changes
    if (purchaseOrder.status !== 'draft' && isChangingOtherFields && isChangingStatus) {
      console.log('Status change allowed for non-draft PO. Other field changes will be ignored.');
    }

    // If vendor is being changed, validate it
    if (vendorId && vendorId !== purchaseOrder.vendorId) {
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
    }

    // Build update data
    // Only update other fields if status is draft, or if we're only changing status
    let updateData = {};
    
    if (purchaseOrder.status === 'draft' || !isChangingOtherFields) {
      // Allow all field updates if draft, or if only changing status
      updateData = {
        vendorId: vendorId !== undefined ? vendorId : purchaseOrder.vendorId,
        poDate: poDate !== undefined ? new Date(poDate) : purchaseOrder.poDate,
        expectedDeliveryDate: expectedDeliveryDate !== undefined ? (expectedDeliveryDate ? new Date(expectedDeliveryDate) : null) : purchaseOrder.expectedDeliveryDate,
        notes: notes !== undefined ? notes : purchaseOrder.notes,
        propertyId: propertyId !== undefined ? (propertyId || null) : purchaseOrder.propertyId,
        unitId: unitId !== undefined ? (unitId || null) : purchaseOrder.unitId,
        leaseId: leaseId !== undefined ? (leaseId || null) : purchaseOrder.leaseId,
        workOrderId: workOrderId !== undefined ? (workOrderId || null) : purchaseOrder.workOrderId,
        deliveryAddress: deliveryAddress !== undefined ? (deliveryAddress || null) : purchaseOrder.deliveryAddress,
        deliveryContactName: deliveryContactName !== undefined ? (deliveryContactName || null) : purchaseOrder.deliveryContactName,
        deliveryContactPhone: deliveryContactPhone !== undefined ? (deliveryContactPhone || null) : purchaseOrder.deliveryContactPhone,
        deliveryInstructions: deliveryInstructions !== undefined ? (deliveryInstructions || null) : purchaseOrder.deliveryInstructions
      };

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
        }

        const { subtotal, taxAmount, totalAmount } = calculateTotals(lineItems);
        updateData.lineItems = lineItems;
        updateData.subtotal = subtotal;
        updateData.taxAmount = taxAmount;
        updateData.totalAmount = totalAmount;
      }
    }
    
    // Always allow status changes
    if (status) {
      updateData.status = status;
    }

    await purchaseOrder.update(updateData, { transaction });

    await transaction.commit();

    // Fetch updated PO with associations
    const updatedPO = await PurchaseOrder.findByPk(purchaseOrder.id, {
      include: [
        {
          model: Vendor,
          as: 'vendor',
          attributes: ['id', 'vendorName', 'email', 'contactPerson']
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
        }
      ]
    });

    res.json({
      success: true,
      message: 'Purchase order updated successfully',
      data: { purchaseOrder: updatedPO }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Cancel purchase order
 */
exports.cancelPurchaseOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const purchaseOrder = await PurchaseOrder.findByPk(id, { transaction });

    if (!purchaseOrder) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    // Cannot cancel if fully received
    if (purchaseOrder.status === 'fully_received') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel purchase order that is fully received'
      });
    }

    await purchaseOrder.update({ status: 'cancelled' }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Purchase order cancelled successfully'
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Get PO status and received quantities
 */
exports.getPOStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const purchaseOrder = await PurchaseOrder.findByPk(id, {
      include: [
        {
          model: require('../models').GoodsReceipt,
          as: 'goodsReceipts',
          attributes: ['id', 'grNumber', 'receiptDate', 'status', 'lineItems']
        }
      ]
    });

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    // Calculate received quantities
    const lineItems = purchaseOrder.lineItems || [];
    const goodsReceipts = purchaseOrder.goodsReceipts || [];

    const receivedQuantities = {};
    goodsReceipts.forEach(gr => {
      if (gr.status === 'completed' && gr.lineItems) {
        gr.lineItems.forEach(grItem => {
          if (!receivedQuantities[grItem.item_id]) {
            receivedQuantities[grItem.item_id] = 0;
          }
          receivedQuantities[grItem.item_id] += grItem.received_qty || 0;
        });
      }
    });

    const statusInfo = lineItems.map(lineItem => ({
      item_id: lineItem.item_id,
      ordered_qty: lineItem.quantity,
      received_qty: receivedQuantities[lineItem.item_id] || 0,
      pending_qty: lineItem.quantity - (receivedQuantities[lineItem.item_id] || 0)
    }));

    res.json({
      success: true,
      data: {
        purchaseOrder: {
          id: purchaseOrder.id,
          poNumber: purchaseOrder.poNumber,
          status: purchaseOrder.status
        },
        statusInfo
      }
    });
  } catch (error) {
    next(error);
  }
};
