const { Invoice, Lease, Tenant } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

// Get all invoices
const getAllInvoices = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status, leaseId, tenantId, dueOnly, fromDueDate, toDueDate, unitId } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { invoiceNumber: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (leaseId) whereClause.leaseId = leaseId;
    if (tenantId) whereClause.tenantId = tenantId;
    // dueOnly: invoices not paid (sent or overdue) - same as "pending for payment"
    if (dueOnly === 'true' || dueOnly === true) {
      whereClause.status = status && ['sent', 'overdue'].includes(status) ? status : { [Op.in]: ['sent', 'overdue'] };
    }
    if (fromDueDate || toDueDate) {
      whereClause.dueDate = {};
      if (fromDueDate) whereClause.dueDate[Op.gte] = fromDueDate;
      if (toDueDate) whereClause.dueDate[Op.lte] = toDueDate;
    }

    const leaseInclude = {
      model: Lease,
      as: 'lease',
      required: !!unitId,
      where: unitId ? { unitId } : undefined,
      include: [
        'tenant',
        {
          association: 'unit',
          include: ['property']
        }
      ]
    };

    const orderDue = dueOnly === 'true' || dueOnly === true ? [['due_date', 'ASC']] : [['created_at', 'DESC']];
    const invoices = await Invoice.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: orderDue,
      include: [
        leaseInclude,
        {
          model: Tenant,
          as: 'tenant'
        },
        {
          model: require('../models').Cheque,
          as: 'cheques'
        },
        {
          model: require('../models').Document,
          as: 'documents',
          required: false,
          where: { isActive: true }
        }
      ]
    });

    res.json({
      success: true,
      data: {
        invoices: invoices.rows,
        pagination: {
          total: invoices.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(invoices.count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get invoice by ID
const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id, {
      include: [
        {
          model: Lease,
          as: 'lease',
          include: ['tenant', 'unit']
        },
        {
          model: Tenant,
          as: 'tenant'
        },
        {
          model: require('../models').Cheque, // Lazy load to avoid circular dep issues in controller top
          as: 'cheques'
        },
        {
          model: require('../models').Document,
          as: 'documents',
          required: false,
          where: { isActive: true }
        }
      ]
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

// Create new invoice
const createInvoice = async (req, res, next) => {
  try {
    const invoiceData = req.body;
    const { selectedPDC } = invoiceData; // Extract selected PDCs
    
    // Generate invoice number
    const invoiceCount = await Invoice.count();
    invoiceData.invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(3, '0')}`;

    const invoice = await Invoice.create(invoiceData);

    // Update Property Actual Revenue
    if (invoice.status === 'paid' && invoice.leaseId) {
      await updatePropertyActualRevenue(invoice.leaseId, invoice.totalAmount);
    }

    // If PDCs are selected, update them with the new invoice ID
    if (selectedPDC && Array.isArray(selectedPDC) && selectedPDC.length > 0) {
      const { Cheque } = require('../models');
      
      const existingIds = [];
      const newCheques = [];
      // Get user ID from request (set by auth middleware)
      // Fallback to 1 (System/Admin) if strictly necessary or dev mode, but req.user should trigger.
      const userId = req.user ? req.user.id : 1; 

      selectedPDC.forEach(pdc => {
          if (typeof pdc === 'object') {
              // Check if it's a virtual CDQ or Rent PDC (temp ID)
              const pdcIdStr = String(pdc.id);
              if (pdcIdStr.startsWith('temp-cdq-') || pdcIdStr.startsWith('temp-rent-')) {
                  const isRent = pdcIdStr.startsWith('temp-rent-');
                  
                  newCheques.push({
                      chequeNumber: pdc.chequeNumber,
                      amount: pdc.amount,
                      chequeDate: pdc.chequeDate || pdc.dueDate, // Ensure date mapping
                      bankName: pdc.bankName || (isRent ? 'Rent Cheque' : 'Service Charge'),
                      status: 'pending', // or 'received'?
                      chequeType: isRent ? 'pdc' : 'current', // Rent is PDC, CDQ is usually current
                      isRent: isRent,
                      leaseId: invoice.leaseId,
                      tenantId: invoice.tenantId,
                      invoiceId: invoice.id, // Link immediately
                      createdBy: userId // REQUIRED FIELD
                  });
              } else if (pdc.id) {
                  existingIds.push(pdc.id);
              }
          } else {
              // If it's just an ID (legacy/simple case), assume existing
              existingIds.push(pdc);
          }
      });

      // 1. Link Existing Cheques
      if (existingIds.length > 0) {
        await Cheque.update(
          { invoiceId: invoice.id },
          { 
            where: { 
              id: { [Op.in]: existingIds } 
            } 
          }
        );
      }

      // 2. Create New Virtual Cheques
      if (newCheques.length > 0) {
          await Cheque.bulkCreate(newCheques);
      }
    }


    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Invoice number already exists. Please use a unique invoice number.'
      });
    }
    next(error);
  }
};

// Update invoice
const updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const invoice = await Invoice.findByPk(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const oldStatus = invoice.status;
    const oldAmount = parseFloat(invoice.totalAmount || 0);

    await invoice.update(updateData);

    // Update Property Actual Revenue
    const newStatus = invoice.status;
    const newAmount = parseFloat(invoice.totalAmount || 0);
    
    let delta = 0;
    if (oldStatus !== 'paid' && newStatus === 'paid') {
      delta = newAmount;
    } else if (oldStatus === 'paid' && newStatus !== 'paid') {
      delta = -oldAmount;
    } else if (oldStatus === 'paid' && newStatus === 'paid') {
      delta = newAmount - oldAmount;
    }

    if (delta !== 0 && invoice.leaseId) {
      await updatePropertyActualRevenue(invoice.leaseId, delta);
    }

    // Handle PDC updates if provided
    if (updateData.selectedPDC && Array.isArray(updateData.selectedPDC)) {
        const { Cheque } = require('../models');
        const { Op } = require('sequelize');

        // 1. Unlink ALL currently linked cheques (reset state)
        await Cheque.update(
            { invoiceId: null },
            { where: { invoiceId: id } }
        );

        const existingIds = [];
        const newCheques = [];
        const userId = req.user ? req.user.id : 1;
        
        updateData.selectedPDC.forEach(pdc => {
            if (typeof pdc === 'object') {
                const pdcIdStr = String(pdc.id);
                if (pdcIdStr.startsWith('temp-cdq-') || pdcIdStr.startsWith('temp-rent-')) {
                     // New Virtual CDQ or Rent PDC
                     const isRent = pdcIdStr.startsWith('temp-rent-');
                     
                     newCheques.push({
                        chequeNumber: pdc.chequeNumber,
                        amount: pdc.amount,
                        chequeDate: pdc.chequeDate || pdc.dueDate,
                        bankName: pdc.bankName || (isRent ? 'Rent Cheque' : 'Service Charge'),
                        status: 'pending',
                        chequeType: isRent ? 'pdc' : 'current',
                        isRent: isRent,
                        leaseId: invoice.leaseId,
                        tenantId: invoice.tenantId,
                        invoiceId: invoice.id,
                        createdBy: userId
                    });
                } else if (pdc.id) {
                    existingIds.push(pdc.id);
                }
            } else {
                existingIds.push(pdc);
            }
        });

        // 2. Relink Selected Existing Cheques
        if (existingIds.length > 0) {
            await Cheque.update(
                { invoiceId: invoice.id },
                { where: { id: { [Op.in]: existingIds } } }
            );
        }

        // 3. Create New Virtual Cheques
        if (newCheques.length > 0) {
            await Cheque.bulkCreate(newCheques);
        }
    }

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        message: 'Invoice number already exists. Please use a unique invoice number.'
      });
    }
    next(error);
  }
};

// Delete invoice
const deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Decouple PDCs/Cheques before deleting
    // We need to require Cheque model here if not at top, or use association
    const { Cheque } = require('../models');
    await Cheque.update(
      { invoiceId: null },
      { where: { invoiceId: id } }
    );

    // Update Property Actual Revenue before destruction
    if (invoice.status === 'paid' && invoice.leaseId) {
      await updatePropertyActualRevenue(invoice.leaseId, -invoice.totalAmount);
    }

    await invoice.destroy();

    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get invoice statistics
const getInvoiceStats = async (req, res, next) => {
  try {
    const totalInvoices = await Invoice.count();
    const paidInvoices = await Invoice.count({ where: { status: 'paid' } });
    const pendingInvoices = await Invoice.count({ where: { status: 'sent' } });
    const overdueInvoices = await Invoice.count({ where: { status: 'overdue' } });

    // Calculate total amounts
    const totalAmount = await Invoice.sum('totalAmount', { where: { status: 'paid' } });
    const pendingAmount = await Invoice.sum('totalAmount', { where: { status: 'sent' } });
    const overdueAmount = await Invoice.sum('totalAmount', { where: { status: 'overdue' } });

    res.json({
      success: true,
      data: {
        counts: {
          total: totalInvoices,
          paid: paidInvoices,
          pending: pendingInvoices,
          overdue: overdueInvoices
        },
        amounts: {
          total: totalAmount || 0,
          pending: pendingAmount || 0,
          overdue: overdueAmount || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get overdue invoices
const getOverdueInvoices = async (req, res, next) => {
  try {
    const overdueInvoices = await Invoice.findAll({
      where: {
        status: 'overdue',
        dueDate: {
          [Op.lt]: new Date()
        }
      },
      include: [
        {
          model: Lease,
          as: 'lease',
          include: ['tenant', 'unit']
        },
        {
          model: Tenant,
          as: 'tenant'
        }
      ],
      order: [['dueDate', 'ASC']]
    });

    res.json({
      success: true,
      data: overdueInvoices
    });
  } catch (error) {
    next(error);
  }
};

// Duplicate invoice
const duplicateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sourceInvoice = await Invoice.findByPk(id);

    if (!sourceInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Source invoice not found'
      });
    }

    // Generate new invoice number safely
    const lastInvoice = await Invoice.findOne({
      order: [['id', 'DESC']]
    });
    
    let nextNum = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
       const parts = lastInvoice.invoiceNumber.split('-');
       if (parts.length === 3 && !isNaN(parseInt(parts[2]))) {
         nextNum = parseInt(parts[2]) + 1;
       }
    }
    
    const newInvoiceNumber = `INV-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;
    
    // Explicitly construct data to avoid copying unique fields/IDs
    const invoiceData = {
      invoiceNumber: newInvoiceNumber,
      status: 'draft', // Corrected from 'pending' to 'draft' to match ENUM
      invoiceDate: new Date(), 
      dueDate: sourceInvoice.dueDate, 
      period: sourceInvoice.period, 
      leaseId: sourceInvoice.leaseId,
      tenantId: sourceInvoice.tenantId,
      description: sourceInvoice.description,
      items: sourceInvoice.items, 
      subtotal: sourceInvoice.subtotal,
      taxRate: sourceInvoice.taxRate, 
      taxAmount: sourceInvoice.taxAmount, 
      totalAmount: sourceInvoice.totalAmount,
      notes: `Duplicated from ${sourceInvoice.invoiceNumber}. ` + (sourceInvoice.notes || ''),
      // copy other fields if they exist in schema
      vendorInvoiceNumber: null,
      purchaseOrderNumber: null
    };

    const newInvoice = await Invoice.create(invoiceData);

    res.status(201).json({
      success: true,
      message: 'Invoice duplicated successfully',
      data: newInvoice
    });
  } catch (error) {
    console.error("Duplicate Error:", error);
    next(error);
  }
};

// Send invoice reminder
const sendReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id, {
      include: [{ model: Tenant, as: 'tenant' }]
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    if (!invoice.tenant || !invoice.tenant.email) {
      return res.status(400).json({
        success: false,
        message: 'Tenant email address is missing. Cannot send reminder.'
      });
    }

    // Simulate sending email
    
    // Log the reminder in invoice notes (simple audit trail)
    const today = new Date().toLocaleDateString('en-AE');
    const note = `Reminder sent on ${today}. `;
    await invoice.update({ 
      notes: (invoice.notes || '') + '\n' + note 
    });

    res.json({
      success: true,
      message: `Reminder sent successfully to ${invoice.tenant.email}`
    });
  } catch (error) {
    next(error);
  }
};

// Get invoice history
const getInvoiceHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByPk(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Construct history from available data
    // In a full system, we might query an AuditLog table. 
    // Here we derive it from related entities.
    const history = [];

    // 1. Creation
    history.push({
      type: 'created',
      date: invoice.createdAt,
      description: 'Invoice created',
      user: 'System' // Or createdBy if available
    });

    // 2. Last Status Update (Approximation based on updatedAt)
    if (invoice.updatedAt > invoice.createdAt) {
       history.push({
        type: 'updated',
        date: invoice.updatedAt,
        description: `Invoice updated (Status: ${invoice.status})`,
        user: 'System'
      });
    }
    
    // 3. Payment info (if paid)
    if (invoice.paidDate) {
      history.push({
        type: 'payment',
        date: invoice.paidDate,
        description: `Payment received via ${invoice.paymentMethod || 'Unknown method'}`,
        user: 'Finance'
      });
    }

    // Sort by date descending
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

// Post invoice voucher
const postInvoice = async (req, res, next) => {
  let t;
  try {
    t = await sequelize.transaction();
    const { id } = req.params;
    const userId = req.user.id;
    const { AccountsTrans, ChartOfAccount, LedgerSetup, AuditLog } = require('../models');

    const invoice = await Invoice.findByPk(id);
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.isPosted) throw new Error('Invoice is already posted');

    const details = (typeof invoice.details === 'string' ? JSON.parse(invoice.details) : invoice.details) || [];
    if (details.length === 0) throw new Error('Cannot post an invoice with no accounting details');

    // 4.1 Validation Requirement: Total Debit Amount = Total Credit Amount
    let totalDebit = 0;
    let totalCredit = 0;
    details.forEach(detail => {
      if (detail.drCr === 'Dr') {
        totalDebit += parseFloat(detail.amount || 0);
      } else {
        totalCredit += parseFloat(detail.amount || 0);
      }
    });

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new Error(`Out of balance: Total Debit (${totalDebit.toFixed(2)}) must equal Total Credit (${totalCredit.toFixed(2)})`);
    }

    // 2.01 Transaction No Calculation
    const lastTrans = await AccountsTrans.findOne({
      order: [['transactionNo', 'DESC']],
      transaction: t
    });
    
    let nextTransNo = 100000;
    if (lastTrans && lastTrans.transactionNo >= 100000) {
      nextTransNo = lastTrans.transactionNo + 1;
    }
    
    const baseTransNo = nextTransNo;

    // Create Ledger Entries
    for (const detail of details) {
      let ledgerId = detail.ledger;
      if (!ledgerId) {
        // Fallback to Ledger Setup mapping if missing in JSON
        const setupType = detail.drCr;
        const setup = await LedgerSetup.findOne({
          where: {
            documentType: 'Sales Invoice',
            amountType: setupType
          },
          transaction: t
        });
        if (setup) ledgerId = setup.postingType;
      }

      if (!ledgerId) throw new Error(`Missing ledger for ${detail.drCr} entry: ${detail.particular}`);

      const ledgerCheck = await ChartOfAccount.findByPk(ledgerId, { transaction: t });
      if (!ledgerCheck) throw new Error(`Invalid Ledger ID (${ledgerId}) for entry: ${detail.particular}`);

      // 1. Transaction Creation / Update
      await AccountsTrans.create({
        transactionNo: nextTransNo++,
        transactionDate: invoice.invoiceDate,
        jvNumber: invoice.invoiceNumber,
        crDr: detail.drCr,
        particular: detail.particular || 'Invoice Entry',
        ledgerId: ledgerId,
        debitAmount: detail.drCr === 'Dr' ? detail.amount : 0,
        creditAmount: detail.drCr === 'Cr' ? detail.amount : 0,
        invoiceId: invoice.id,
        billId: null, // this is for vendor invoices
        narration: detail.narration || invoice.description || invoice.notes,
      }, { transaction: t });

      // Update Account Balance
      const amount = parseFloat(detail.amount);
      const isNormalDebit = ['asset', 'expense'].includes(ledgerCheck.accountType);
      const change = detail.drCr === 'Dr' 
        ? (isNormalDebit ? amount : -amount)
        : (isNormalDebit ? -amount : amount);

      await ledgerCheck.update({
        balance: parseFloat(ledgerCheck.balance || 0) + change
      }, { transaction: t });
    }

    // 3.2 Lock the Invoice page
    await invoice.update({
      isPosted: true,
      postedBy: userId,
      postedAt: new Date(),
      transactionNo: baseTransNo,
      status: invoice.status === 'draft' ? 'sent' : invoice.status
    }, { transaction: t });

    await t.commit();
    res.json({ success: true, message: 'Invoice posted successfully and locked', transactionNo: baseTransNo });
  } catch (error) {
    if (t) await t.rollback();
    res.status(400).json({ success: false, message: error.message });
  }
};

// UnPost invoice voucher
const unpostInvoice = async (req, res, next) => {
  let t;
  try {
    t = await sequelize.transaction();
    const { id } = req.params;
    const userId = req.user.id;
    const { AccountsTrans, ChartOfAccount, AuditLog } = require('../models');

    const invoice = await Invoice.findByPk(id);
    if (!invoice) throw new Error('Invoice not found');
    if (!invoice.isPosted) throw new Error('Only posted invoices can be unposted');

    const details = (typeof invoice.details === 'string' ? JSON.parse(invoice.details) : invoice.details) || [];

    // 1. Revert ledger impacts
    for (const detail of details) {
      const ledgerId = detail.ledger;
      const account = await ChartOfAccount.findByPk(ledgerId, { transaction: t });
      if (account) {
        const amount = parseFloat(detail.amount);
        const isNormalDebit = ['asset', 'expense'].includes(account.accountType);
        
        const reverseChange = detail.drCr === 'Dr'
          ? (isNormalDebit ? -amount : amount)
          : (isNormalDebit ? amount : -amount);

        await account.update({
          balance: parseFloat(account.balance || 0) + reverseChange
        }, { transaction: t });
      }
    }

    // 2. Remove entries from Accounts_Trans
    await AccountsTrans.destroy({ where: { invoiceId: id }, transaction: t });

    // 3. Mark as unposted and unlock
    const oldValues = invoice.get({ plain: true });
    await invoice.update({
      isPosted: false,
      postedBy: null,
      postedAt: null,
      transactionNo: null
    }, { transaction: t });

    // 4. Audit Tracking
    if (AuditLog) {
      await AuditLog.create({
        entityType: 'Invoice',
        entityId: id,
        action: 'UnPost',
        oldValue: oldValues,
        newValue: invoice.get({ plain: true }),
        userId: userId,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.get('user-agent') || 'system'
      }, { transaction: t });
    }

    await t.commit();
    res.json({ success: true, message: 'Invoice unposted successfully and unlocked' });
  } catch (error) {
    if (t) await t.rollback();
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoiceStats,
  getOverdueInvoices,
  duplicateInvoice,
  sendReminder,
  getInvoiceHistory,
  postInvoice,
  unpostInvoice,
  updatePropertyActualRevenue
};

/**
 * Helper to update property actual revenue based on invoice changes
 * @param {number} leaseId - The lease ID associated with the invoice
 * @param {number} amountChange - The amount to add (can be negative)
 */
async function updatePropertyActualRevenue(leaseId, amountChange) {
  try {
    const { Lease, Unit, Property } = require('../models');
    const lease = await Lease.findByPk(leaseId, {
      include: [{
        model: Unit,
        as: 'unit',
        include: [{
          model: Property,
          as: 'property'
        }]
      }]
    });

    if (lease && lease.unit && lease.unit.property) {
      const property = lease.unit.property;
      const currentRevenue = parseFloat(property.actualRevenue || 0);
      await property.update({
        actualRevenue: currentRevenue + parseFloat(amountChange)
      });
      console.log(`✅ Updated Property ${property.id} actual revenue by ${amountChange}. New total: ${currentRevenue + parseFloat(amountChange)}`);
    }
  } catch (error) {
    console.error('❌ Error updating property actual revenue:', error);
    // We don't throw here to avoid failing the main invoice operation, but it's risky.
  }
}
