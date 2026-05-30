const { Ticket, Tenant, Unit, User, VendorInvoice, Vendor, TicketNote, Property, sequelize } = require('../models');
const companyDocumentNumber = require('../services/companyDocumentNumber.service');
const documentNumberingService = require('../services/documentNumberingService');
console.log('DEBUG: TicketNote imported in ticketController.js:', !!TicketNote);
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');
const { companyWhere, withCompanyId } = require('../utils/companyScope');

const normalizeNullableId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeTicketPayload = (payload = {}) => {
  const normalized = { ...payload };
  normalized.unitId = normalizeNullableId(payload.unitId);
  normalized.tenantId = normalizeNullableId(payload.tenantId);
  normalized.propertyId = normalizeNullableId(payload.propertyId);
  normalized.assignedTo = normalizeNullableId(payload.assignedTo ?? payload.assigneeId);
  delete normalized.assigneeId;
  return normalized;
};

// Get all tickets
const getAllTickets = async (req, res, next) => {
  try {
    const { search, status, priority, category, assignedTo } = req.query;
    
    // Normalize pagination with max limit enforcement
    const { page, limit, offset } = normalizePagination(req.query, 10, 100);

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { ticketNumber: { [Op.like]: `%${search}%` } },
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;
    if (category) whereClause.category = category;
    if (assignedTo) whereClause.assignedTo = assignedTo;

    const tickets = await Ticket.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Property,
          as: 'property',
          required: false
        },
        {
          model: Tenant,
          as: 'tenant'
        },
        {
          model: Unit,
          as: 'unit',
          required: false,
          include: [
            {
              association: 'property',
              required: false,
              },
          ]
        },
        {
          model: User,
          as: 'assignedUser'
        },
        {
          model: Vendor,
          as: 'vendor'
        }
      ]
    });

    res.json({
      success: true,
      data: {
        tickets: tickets.rows,
        pagination: createPaginationMeta(tickets.count, page, limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get ticket by ID
const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findByPk(id, {
      include: [
        {
          model: Property,
          as: 'property'
        },
        {
          model: Tenant,
          as: 'tenant'
        },
        {
          model: Unit,
          as: 'unit',
          include: ['property']
        },
        {
          model: User,
          as: 'assignedUser'
        },
        {
          model: Vendor,
          as: 'vendor'
        },
        {
          model: TicketNote || sequelize.models.TicketNote,
          as: 'notes',
          include: [{ model: User, as: 'user' }]
        }
      ]
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    next(error);
  }
};

// Create new ticket
const createTicket = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const ticketData = normalizeTicketPayload(req.body);
    
    // Generate ticket number
    let generatedNumber = await companyDocumentNumber.generateDocumentNumber({
      companyId: req.companyId,
      documentType: 'helpdesk',
      transaction,
    });
    if (!generatedNumber) {
      generatedNumber = await documentNumberingService.generateDocumentNumber('Helpdesk', transaction, {
        unitId: ticketData.unitId,
      });
    }
    if (generatedNumber) {
      ticketData.ticketNumber = generatedNumber;
    } else {
      const manualNumber = documentNumberingService.normalizeManualDocumentNumber(ticketData.ticketNumber);
      if (!manualNumber) {
        const ticketCount = await Ticket.count({ where: { ...companyWhere(req) }, transaction });
        ticketData.ticketNumber = `TKT-${new Date().getFullYear()}-${String(ticketCount + 1).padStart(3, '0')}`;
      } else {
        const existingTicket = await Ticket.findOne({
          where: { ticketNumber: manualNumber, ...companyWhere(req) },
          transaction,
        });
        if (existingTicket) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Ticket number '${manualNumber}' already exists.`,
          });
        }
        ticketData.ticketNumber = manualNumber;
      }
    }

    const ticket = await Ticket.create(withCompanyId(req, ticketData), { transaction });
    await transaction.commit();

    const createdTicket = await Ticket.findByPk(ticket.id, {
      include: [
        { model: Property, as: 'property' },
        { model: Tenant, as: 'tenant' },
        { model: Unit, as: 'unit', include: ['property'] },
        { model: User, as: 'assignedUser' },
        { model: Vendor, as: 'vendor' },
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: createdTicket || ticket
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    next(error);
  }
};

// Update ticket
const updateTicket = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const updateData = normalizeTicketPayload(req.body);

    const ticket = await Ticket.findByPk(id, {
      include: [
        {
          model: Property,
          as: 'property'
        },
        {
          model: Unit,
          as: 'unit',
          include: ['property']
        }
      ]
    });
    
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const oldStatus = ticket.status;
    await ticket.update(updateData, { transaction });

    // Auto-create vendor invoice if ticket is marked as resolved or closed
    if (oldStatus !== 'resolved' && (updateData.status === 'resolved' || updateData.status === 'closed')) {
      if (ticket.estimatedCost && ticket.vendorId) {
        await createVendorInvoiceFromTicket({ ...ticket.toJSON(), ...updateData }, transaction);
      }
    }

    await transaction.commit();

    const updatedTicket = await Ticket.findByPk(id, {
      include: [
        { model: Property, as: 'property' },
        { model: Tenant, as: 'tenant' },
        { model: Unit, as: 'unit', include: ['property'] },
        { model: User, as: 'assignedUser' },
        { model: Vendor, as: 'vendor' },
        {
          model: TicketNote || sequelize.models.TicketNote,
          as: 'notes',
          include: [{ model: User, as: 'user' }]
        }
      ]
    });

    res.json({
      success: true,
      message: 'Ticket updated successfully',
      data: updatedTicket || ticket
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Auto-create vendor invoice from completed maintenance ticket
 */
async function createVendorInvoiceFromTicket(ticket, transaction) {
  const { id: ticketId, vendorId, estimatedCost, actualCost, ticketNumber, title } = ticket;
  
  // Use actual cost if available, otherwise use estimated cost
  const invoiceAmount = actualCost || estimatedCost;
  const taxRate = 5; // UAE VAT
  const subtotal = parseFloat(invoiceAmount);
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;

  // Get vendor details
  const vendor = await Vendor.findByPk(vendorId);
  if (!vendor) {
    console.warn(`Vendor ${vendorId} not found for ticket ${ticketNumber}`);
    return;
  }

  // Generate invoice number
  const invoiceCount = await VendorInvoice.count();
  const invoiceNumber = `VI-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(4, '0')}`;

  // Calculate due date based on vendor payment terms
  const invoiceDate = new Date();
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + (vendor.paymentTerms || 30));

  // Create vendor invoice
  const vendorInvoice = await VendorInvoice.create({
    invoiceNumber,
    vendorId,
    invoiceDate,
    dueDate,
    subtotal,
    taxRate,
    taxAmount,
    totalAmount,
    status: 'pending',
    description: `Maintenance work: ${title} (Ticket: ${ticketNumber})`,
    referenceType: 'maintenance_ticket',
    referenceId: ticketId,
    propertyId: ticket.propertyId || ticket.unit?.propertyId || null
  }, { transaction });

  console.log(`Auto-created vendor invoice ${invoiceNumber} for ticket ${ticketNumber}`);
  
  return vendorInvoice;
}

// Delete ticket
const deleteTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findByPk(id);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    await ticket.destroy();

    res.json({
      success: true,
      message: 'Ticket deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get ticket statistics
const getTicketStats = async (req, res, next) => {
  try {
    const totalTickets = await Ticket.count();
    const openTickets = await Ticket.count({ where: { status: 'open' } });
    const inProgressTickets = await Ticket.count({ where: { status: 'in_progress' } });
    const resolvedTickets = await Ticket.count({ where: { status: 'resolved' } });
    const closedTickets = await Ticket.count({ where: { status: 'closed' } });

    res.json({
      success: true,
      data: {
        total: totalTickets,
        open: openTickets,
        inProgress: inProgressTickets,
        resolved: resolvedTickets,
        closed: closedTickets
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get tickets by priority
const getTicketsByPriority = async (req, res, next) => {
  try {
    const { priority } = req.params;
    const tickets = await Ticket.findAll({
      where: { priority },
      include: [
        {
          model: Property,
          as: 'property'
        },
        {
          model: Tenant,
          as: 'tenant'
        },
        {
          model: Unit,
          as: 'unit',
          include: ['property']
        },
        {
          model: User,
          as: 'assignedUser'
        },
        {
          model: Vendor,
          as: 'vendor'
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: tickets
    });
  } catch (error) {
    next(error);
  }
};

// Add note to ticket
const addTicketNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note, isInternal } = req.body;
    const userId = req.user.id; // Assuming auth middleware sets req.user

    const ticket = await Ticket.findByPk(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    const newNote = await TicketNote.create({
      ticketId: id,
      userId,
      note,
      isInternal: isInternal || false
    });

    const noteWithUser = await TicketNote.findByPk(newNote.id, {
      include: [{ model: User, as: 'user' }]
    });

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: noteWithUser
    });
  } catch (error) {
    next(error);
  }
};

// Delete note from ticket
const deleteTicketNote = async (req, res, next) => {
  try {
    const { noteId } = req.params;
    
    const note = await TicketNote.findByPk(noteId);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    await note.destroy();

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get ticket options (statuses, priorities, categories)
const getTicketOptions = async (req, res, next) => {
  try {
    const options = {
      statuses: [
        { value: 'open', label: 'Open', color: 'bg-blue-100 text-blue-800 border-blue-200' },
        { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
        { value: 'resolved', label: 'Resolved', color: 'bg-green-100 text-green-800 border-green-200' },
        { value: 'closed', label: 'Closed', color: 'bg-gray-100 text-gray-800 border-gray-200' },
        { value: 'scheduled', label: 'Scheduled', color: 'bg-purple-100 text-purple-800 border-purple-200' },
        { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200' }
      ],
      priorities: [
        { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800 border-green-200' },
        { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
        { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-200' },
        { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800 border-red-200' }
      ],
      categories: [
        { value: 'HVAC', label: 'HVAC' },
        { value: 'Plumbing', label: 'Plumbing' },
        { value: 'Electrical', label: 'Electrical' },
        { value: 'Elevator', label: 'Elevator' },
        { value: 'General', label: 'General' },
        { value: 'Security', label: 'Security' },
        { value: 'Cleaning', label: 'Cleaning' }
      ]
    };

    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  getTicketStats,
  getTicketsByPriority,
  addTicketNote,
  deleteTicketNote,
  getTicketOptions
};
