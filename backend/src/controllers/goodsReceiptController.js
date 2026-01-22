/**
 * Goods Receipt Controller
 * Handles Goods Receipt operations for Procurement Module
 */

const { GoodsReceipt, PurchaseOrder, User, Item, Property, Unit, sequelize } = require('../models');
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');

/**
 * Generate unique GR number
 */
async function generateGRNumber() {
  const year = new Date().getFullYear();
  const count = await GoodsReceipt.count();
  const number = `GR-${year}-${String(count + 1).padStart(4, '0')}`;
  
  const exists = await GoodsReceipt.findOne({ where: { grNumber: number } });
  if (exists) {
    return `GR-${year}-${String(count + 2).padStart(4, '0')}`;
  }
  return number;
}

/**
 * Update PO status based on received quantities
 */
async function updatePOStatus(purchaseOrderId, transaction) {
  const purchaseOrder = await PurchaseOrder.findByPk(purchaseOrderId, { transaction });
  if (!purchaseOrder) return;

  // Get all completed GRs for this PO
  // Use Sequelize's attribute name (camelCase) since model has field mapping
  const goodsReceipts = await GoodsReceipt.findAll({
    where: {
      purchaseOrderId: purchaseOrderId,
      status: 'completed'
    },
    transaction
  });

  // Parse lineItems if it's a string, ensure it's always an array
  let lineItems = purchaseOrder.lineItems || [];
  if (typeof lineItems === 'string') {
    try {
      lineItems = JSON.parse(lineItems);
    } catch (e) {
      console.error('Failed to parse lineItems:', e);
      lineItems = [];
    }
  }
  if (!Array.isArray(lineItems)) {
    lineItems = [];
  }
  
  const receivedQuantities = {};

  // Calculate total received quantities
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
      grLineItems.forEach(grItem => {
        const itemId = parseInt(grItem.item_id) || grItem.item_id;
        const itemIdStr = itemId.toString();
        if (!receivedQuantities[itemId] && !receivedQuantities[itemIdStr]) {
          receivedQuantities[itemId] = 0;
          receivedQuantities[itemIdStr] = 0;
        }
        const receivedQty = parseFloat(grItem.received_qty) || 0;
        receivedQuantities[itemId] = (receivedQuantities[itemId] || 0) + receivedQty;
        receivedQuantities[itemIdStr] = (receivedQuantities[itemIdStr] || 0) + receivedQty;
      });
    }
  });

  // Check if all items are fully received
  let allFullyReceived = true;
  let anyPartiallyReceived = false;

  lineItems.forEach(lineItem => {
    const orderedQty = lineItem.quantity || 0;
    const receivedQty = receivedQuantities[lineItem.item_id] || 0;
    
    if (receivedQty < orderedQty) {
      allFullyReceived = false;
    }
    if (receivedQty > 0 && receivedQty < orderedQty) {
      anyPartiallyReceived = true;
    }
  });

  // Update PO status
  let newStatus = purchaseOrder.status;
  if (allFullyReceived && lineItems.length > 0) {
    newStatus = 'fully_received';
  } else if (anyPartiallyReceived) {
    newStatus = 'partially_received';
  }

  if (newStatus !== purchaseOrder.status) {
    await purchaseOrder.update({ status: newStatus }, { transaction });
  }
}

/**
 * Get all goods receipts with filters and pagination
 */
exports.getAllGoodsReceipts = async (req, res, next) => {
  try {
    const { search, purchaseOrderId, status, startDate, endDate, deliveryPropertyId, deliveryUnitId } = req.query;
    const { page, limit, offset } = normalizePagination(req.query, 10, 500);

    const whereClause = {};

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { grNumber: { [Op.like]: `%${search}%` } }
      ];
    }

    // PO filter - use Sequelize attribute name
    if (purchaseOrderId) {
      whereClause.purchaseOrderId = purchaseOrderId;
    }

    // Delivery location filters
    if (deliveryPropertyId) {
      whereClause.deliveryPropertyId = deliveryPropertyId;
    }
    if (deliveryUnitId) {
      whereClause.deliveryUnitId = deliveryUnitId;
    }

    // Status filter
    if (status) {
      whereClause.status = status;
    }

    // Date range filter
    if (startDate && endDate) {
      whereClause.receipt_date = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereClause.receipt_date = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereClause.receipt_date = {
        [Op.lte]: new Date(endDate)
      };
    }

    const { count, rows: goodsReceipts } = await GoodsReceipt.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: PurchaseOrder,
          as: 'purchaseOrder',
          attributes: ['id', 'poNumber', 'vendorId', 'poDate'],
          include: [
            {
              model: require('../models').Vendor,
              as: 'vendor',
              attributes: ['id', 'vendorName']
            }
          ]
        },
        {
          model: Property,
          as: 'deliveryProperty',
          attributes: ['id', 'title', 'location'],
          required: false
        },
        {
          model: Unit,
          as: 'deliveryUnit',
          attributes: ['id', 'unitNumber', 'type'],
          required: false
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'name', 'email'],
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
        goodsReceipts,
        pagination: createPaginationMeta(count, page, limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get goods receipt by ID
 */
exports.getGoodsReceiptById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const goodsReceipt = await GoodsReceipt.findByPk(id, {
      include: [
        {
          model: PurchaseOrder,
          as: 'purchaseOrder',
          attributes: ['id', 'poNumber', 'vendorId', 'poDate', 'lineItems', 'propertyId', 'unitId', 'deliveryAddress', 'deliveryContactName', 'deliveryContactPhone'],
          include: [
            {
              model: require('../models').Vendor,
              as: 'vendor',
              attributes: ['id', 'vendorName']
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
            }
          ]
        },
        {
          model: Property,
          as: 'deliveryProperty',
          attributes: ['id', 'title', 'location'],
          required: false
        },
        {
          model: Unit,
          as: 'deliveryUnit',
          attributes: ['id', 'unitNumber', 'type'],
          required: false
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!goodsReceipt) {
      return res.status(404).json({
        success: false,
        message: 'Goods receipt not found'
      });
    }

    // Enrich line items with item details
    // Parse lineItems if it's a string, ensure it's always an array
    let lineItems = goodsReceipt.lineItems || [];
    if (typeof lineItems === 'string') {
      try {
        lineItems = JSON.parse(lineItems);
      } catch (e) {
        console.error('Failed to parse lineItems:', e);
        lineItems = [];
      }
    }
    if (!Array.isArray(lineItems)) {
      lineItems = [];
    }
    
    const enrichedLineItems = await Promise.all(
      lineItems.map(async (lineItem) => {
        const item = await Item.findByPk(lineItem.item_id, {
          attributes: ['id', 'itemCode', 'itemName', 'itemCategory', 'unitOfMeasure']
        });
        return {
          ...lineItem,
          item: item || null
        };
      })
    );

    res.json({
      success: true,
      data: {
        goodsReceipt: {
          ...goodsReceipt.toJSON(),
          lineItems: enrichedLineItems
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new goods receipt
 */
exports.createGoodsReceipt = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { 
      purchaseOrderId, 
      receiptDate, 
      receivedBy, 
      lineItems, 
      notes,
      deliveryPropertyId,
      deliveryUnitId,
      deliveryAddress,
      deliveryContactName,
      deliveryContactPhone,
      deliveryNotes
    } = req.body;

    // Validate purchase order
    const purchaseOrder = await PurchaseOrder.findByPk(purchaseOrderId, {
      include: [
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
        }
      ],
      transaction
    });

    if (!purchaseOrder) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    if (purchaseOrder.status === 'cancelled') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cannot create goods receipt for cancelled purchase order'
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

    // Parse lineItems if it's a string, ensure it's always an array
    let poLineItems = purchaseOrder.lineItems || [];
    if (typeof poLineItems === 'string') {
      try {
        poLineItems = JSON.parse(poLineItems);
      } catch (e) {
        console.error('Failed to parse lineItems:', e);
        poLineItems = [];
      }
    }
    if (!Array.isArray(poLineItems)) {
      poLineItems = [];
    }
    
    const poLineItemsMap = {};
    poLineItems.forEach(item => {
      const itemId = parseInt(item.item_id) || item.item_id;
      poLineItemsMap[itemId] = item;
      poLineItemsMap[itemId.toString()] = item; // Also map as string for flexibility
    });

    // Get existing GRs to calculate already received quantities
    const existingGRs = await GoodsReceipt.findAll({
      where: {
        purchaseOrderId: purchaseOrderId,
        status: 'completed'
      },
      transaction
    });

    const receivedQuantities = {};
    existingGRs.forEach(gr => {
      let grLineItems = gr.lineItems || [];
      if (typeof grLineItems === 'string') {
        try {
          grLineItems = JSON.parse(grLineItems);
        } catch (e) {
          grLineItems = [];
        }
      }
      if (Array.isArray(grLineItems)) {
        grLineItems.forEach(grItem => {
          const itemId = parseInt(grItem.item_id) || grItem.item_id;
          const itemIdStr = itemId.toString();
          if (!receivedQuantities[itemId] && !receivedQuantities[itemIdStr]) {
            receivedQuantities[itemId] = 0;
            receivedQuantities[itemIdStr] = 0;
          }
          const receivedQty = parseFloat(grItem.received_qty) || 0;
          receivedQuantities[itemId] = (receivedQuantities[itemId] || 0) + receivedQty;
          receivedQuantities[itemIdStr] = (receivedQuantities[itemIdStr] || 0) + receivedQty;
        });
      }
    });

    // Validate received quantities don't exceed ordered quantities
    for (const lineItem of lineItems) {
      // Ensure item_id is a number
      const itemId = parseInt(lineItem.item_id);
      if (!itemId || isNaN(itemId)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Invalid item_id: ${lineItem.item_id}`
        });
      }

      const poLineItem = poLineItemsMap[itemId] || poLineItemsMap[itemId.toString()];
      if (!poLineItem) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Item ${itemId} not found in purchase order`
        });
      }

      const orderedQty = parseFloat(poLineItem.quantity) || 0;
      const alreadyReceivedQty = receivedQuantities[itemId] || receivedQuantities[itemId.toString()] || 0;
      const receivedQty = parseFloat(lineItem.received_qty) || 0;
      const totalReceivedQty = alreadyReceivedQty + receivedQty;

      if (totalReceivedQty > orderedQty) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Received quantity for item ${itemId} exceeds ordered quantity. Ordered: ${orderedQty}, Already received: ${alreadyReceivedQty}, Trying to receive: ${receivedQty}`
        });
      }

      // Validate item exists
      const item = await Item.findOne({
        where: { id: itemId, isActive: true },
        transaction
      });
      if (!item) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: `Item with ID ${itemId} not found`
        });
      }
    }

    // Validate user authentication
    if (!req.user || !req.user.id) {
      await transaction.rollback();
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    // Auto-populate delivery info from PO if not provided
    let finalDeliveryPropertyId = deliveryPropertyId || purchaseOrder.propertyId || null;
    let finalDeliveryUnitId = deliveryUnitId || purchaseOrder.unitId || null;
    let finalDeliveryAddress = deliveryAddress || purchaseOrder.deliveryAddress || null;
    let finalDeliveryContactName = deliveryContactName || purchaseOrder.deliveryContactName || null;
    let finalDeliveryContactPhone = deliveryContactPhone || purchaseOrder.deliveryContactPhone || null;

    // If property/unit selected, build address from property/unit if address not provided
    if (!finalDeliveryAddress && finalDeliveryPropertyId) {
      const deliveryProperty = await Property.findByPk(finalDeliveryPropertyId, { transaction });
      if (deliveryProperty) {
        let addressParts = [deliveryProperty.location];
        if (deliveryProperty.emirate) addressParts.push(deliveryProperty.emirate);
        if (deliveryProperty.community) addressParts.push(deliveryProperty.community);
        
        if (finalDeliveryUnitId) {
          const deliveryUnit = await Unit.findByPk(finalDeliveryUnitId, { transaction });
          if (deliveryUnit) {
            addressParts.push(`Unit ${deliveryUnit.unitNumber}`);
          }
        }
        finalDeliveryAddress = addressParts.join(', ');
      }
    }

    // Generate GR number
    const grNumber = await generateGRNumber();

    // Normalize line items - ensure item_id is a number
    const normalizedLineItems = lineItems.map(item => ({
      item_id: parseInt(item.item_id),
      ordered_qty: parseFloat(item.ordered_qty) || 0,
      received_qty: parseFloat(item.received_qty) || 0,
      unit_price: parseFloat(item.unit_price) || 0
    }));

    // For DATEONLY type, use the date string directly (YYYY-MM-DD format)
    const receiptDateValue = receiptDate ? (receiptDate instanceof Date ? receiptDate.toISOString().split('T')[0] : receiptDate) : new Date().toISOString().split('T')[0];
    
    console.log('Creating goods receipt with data:', {
      grNumber,
      purchaseOrderId,
      receiptDate: receiptDateValue,
      receivedBy: receivedBy ? parseInt(receivedBy) : req.user.id,
      lineItems: normalizedLineItems,
      notes,
      deliveryPropertyId: finalDeliveryPropertyId,
      deliveryUnitId: finalDeliveryUnitId,
      deliveryAddress: finalDeliveryAddress,
      deliveryContactName: finalDeliveryContactName,
      deliveryContactPhone: finalDeliveryContactPhone,
      deliveryNotes,
      status: 'completed',
      createdBy: req.user.id
    });
    
    const goodsReceipt = await GoodsReceipt.create({
      grNumber,
      purchaseOrderId: purchaseOrderId,
      receiptDate: receiptDateValue,
      receivedBy: receivedBy ? parseInt(receivedBy) : req.user.id,
      lineItems: normalizedLineItems, // Sequelize will handle JSON serialization
      notes: notes || null,
      deliveryPropertyId: finalDeliveryPropertyId,
      deliveryUnitId: finalDeliveryUnitId,
      deliveryAddress: finalDeliveryAddress,
      deliveryContactName: finalDeliveryContactName,
      deliveryContactPhone: finalDeliveryContactPhone,
      deliveryNotes: deliveryNotes || null,
      status: 'completed', // Auto-complete on creation
      createdBy: req.user.id
    }, { transaction });

    // Update PO status
    await updatePOStatus(purchaseOrderId, transaction);

    await transaction.commit();

    // Fetch created GR with associations
    const createdGR = await GoodsReceipt.findByPk(goodsReceipt.id, {
      include: [
        {
          model: PurchaseOrder,
          as: 'purchaseOrder',
          attributes: ['id', 'poNumber', 'vendorId'],
          include: [
            {
              model: require('../models').Vendor,
              as: 'vendor',
              attributes: ['id', 'vendorName']
            }
          ]
        },
        {
          model: Property,
          as: 'deliveryProperty',
          attributes: ['id', 'title', 'location'],
          required: false
        },
        {
          model: Unit,
          as: 'deliveryUnit',
          attributes: ['id', 'unitNumber', 'type'],
          required: false
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'name', 'email'],
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
      message: 'Goods receipt created successfully',
      data: { goodsReceipt: createdGR }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating goods receipt:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    console.error('User:', req.user);
    
    // Return more descriptive error
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Foreign key constraint error. Please check that the purchase order and user exist.'
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'A goods receipt with this number already exists'
      });
    }
    
    // Generic error response
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create goods receipt',
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.message,
        stack: error.stack 
      })
    });
  }
};

/**
 * Update goods receipt (only if draft)
 */
exports.updateGoodsReceipt = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { 
      receiptDate, 
      receivedBy, 
      lineItems, 
      notes, 
      status,
      deliveryPropertyId,
      deliveryUnitId,
      deliveryAddress,
      deliveryContactName,
      deliveryContactPhone,
      deliveryNotes
    } = req.body;

    const goodsReceipt = await GoodsReceipt.findByPk(id, { transaction });

    if (!goodsReceipt) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Goods receipt not found'
      });
    }

    // Only allow updates if status is draft
    if (goodsReceipt.status !== 'draft') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Can only update goods receipts with draft status'
      });
    }

    const updateData = {
      receiptDate: receiptDate ? (receiptDate instanceof Date ? receiptDate.toISOString().split('T')[0] : receiptDate) : goodsReceipt.receiptDate,
      receivedBy: receivedBy || goodsReceipt.receivedBy,
      notes: notes !== undefined ? notes : goodsReceipt.notes,
      deliveryPropertyId: deliveryPropertyId !== undefined ? (deliveryPropertyId || null) : goodsReceipt.deliveryPropertyId,
      deliveryUnitId: deliveryUnitId !== undefined ? (deliveryUnitId || null) : goodsReceipt.deliveryUnitId,
      deliveryAddress: deliveryAddress !== undefined ? (deliveryAddress || null) : goodsReceipt.deliveryAddress,
      deliveryContactName: deliveryContactName !== undefined ? (deliveryContactName || null) : goodsReceipt.deliveryContactName,
      deliveryContactPhone: deliveryContactPhone !== undefined ? (deliveryContactPhone || null) : goodsReceipt.deliveryContactPhone,
      deliveryNotes: deliveryNotes !== undefined ? (deliveryNotes || null) : goodsReceipt.deliveryNotes
    };

    if (status) {
      updateData.status = status;
    }

    // If line items are being updated, validate them
    if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
      const purchaseOrder = await PurchaseOrder.findByPk(goodsReceipt.purchaseOrderId, { transaction });
      
      // Parse lineItems if it's a string, ensure it's always an array
      let poLineItems = purchaseOrder.lineItems || [];
      if (typeof poLineItems === 'string') {
        try {
          poLineItems = JSON.parse(poLineItems);
        } catch (e) {
          console.error('Failed to parse lineItems:', e);
          poLineItems = [];
        }
      }
      if (!Array.isArray(poLineItems)) {
        poLineItems = [];
      }
      
      const poLineItemsMap = {};
      poLineItems.forEach(item => {
        const itemId = parseInt(item.item_id) || item.item_id;
        poLineItemsMap[itemId] = item;
        poLineItemsMap[itemId.toString()] = item; // Also map as string for flexibility
      });

      // Get existing GRs (excluding current one) to calculate already received quantities
      const existingGRs = await GoodsReceipt.findAll({
        where: {
          purchaseOrderId: goodsReceipt.purchaseOrderId,
          status: 'completed',
          id: { [Op.ne]: id }
        },
        transaction
      });

      const receivedQuantities = {};
      existingGRs.forEach(gr => {
        let grLineItems = gr.lineItems || [];
        if (typeof grLineItems === 'string') {
          try {
            grLineItems = JSON.parse(grLineItems);
          } catch (e) {
            grLineItems = [];
          }
        }
        if (Array.isArray(grLineItems)) {
          grLineItems.forEach(grItem => {
            const itemId = parseInt(grItem.item_id) || grItem.item_id;
            const itemIdStr = itemId.toString();
            if (!receivedQuantities[itemId] && !receivedQuantities[itemIdStr]) {
              receivedQuantities[itemId] = 0;
              receivedQuantities[itemIdStr] = 0;
            }
            const receivedQty = parseFloat(grItem.received_qty) || 0;
            receivedQuantities[itemId] = (receivedQuantities[itemId] || 0) + receivedQty;
            receivedQuantities[itemIdStr] = (receivedQuantities[itemIdStr] || 0) + receivedQty;
          });
        }
      });

      // Validate received quantities
      for (const lineItem of lineItems) {
        const itemId = parseInt(lineItem.item_id) || lineItem.item_id;
        const poLineItem = poLineItemsMap[itemId] || poLineItemsMap[itemId.toString()];
        if (!poLineItem) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Item ${itemId} not found in purchase order`
          });
        }

        const orderedQty = parseFloat(poLineItem.quantity) || 0;
        const alreadyReceivedQty = receivedQuantities[itemId] || receivedQuantities[itemId.toString()] || 0;
        const receivedQty = parseFloat(lineItem.received_qty) || 0;
        const totalReceivedQty = alreadyReceivedQty + receivedQty;

        if (totalReceivedQty > orderedQty) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Received quantity for item ${itemId} exceeds ordered quantity. Ordered: ${orderedQty}, Already received: ${alreadyReceivedQty}, Trying to receive: ${receivedQty}`
          });
        }
      }

      updateData.lineItems = lineItems;
    }

    await goodsReceipt.update(updateData, { transaction });

    // If status changed to completed, update PO status
    if (status === 'completed') {
      await updatePOStatus(goodsReceipt.purchaseOrderId, transaction);
    }

    await transaction.commit();

    // Fetch updated GR with associations
    const updatedGR = await GoodsReceipt.findByPk(goodsReceipt.id, {
      include: [
        {
          model: PurchaseOrder,
          as: 'purchaseOrder',
          attributes: ['id', 'poNumber', 'vendorId'],
          include: [
            {
              model: require('../models').Vendor,
              as: 'vendor',
              attributes: ['id', 'vendorName']
            }
          ]
        },
        {
          model: Property,
          as: 'deliveryProperty',
          attributes: ['id', 'title', 'location'],
          required: false
        },
        {
          model: Unit,
          as: 'deliveryUnit',
          attributes: ['id', 'unitNumber', 'type'],
          required: false
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'name', 'email'],
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
      message: 'Goods receipt updated successfully',
      data: { goodsReceipt: updatedGR }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Get goods receipts by purchase order
 */
exports.getGRByPO = async (req, res, next) => {
  try {
    const { poId } = req.params;

    const goodsReceipts = await GoodsReceipt.findAll({
      where: { purchaseOrderId: poId },
      include: [
        {
          model: User,
          as: 'receiver',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { goodsReceipts }
    });
  } catch (error) {
    next(error);
  }
};
