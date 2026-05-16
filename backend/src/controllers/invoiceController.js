const { Invoice, Lease, Tenant, ChartOfAccount, AccountsTrans } = require('../models');
const documentNumberingService = require('../services/documentNumberingService');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');

// Get all invoices
const getAllInvoices = async (req, res, next) => {
  try {
    const {
      search,
      status,
      leaseId,
      tenantId,
      dueOnly,
      fromDueDate,
      toDueDate,
      unitId,
      openOnly,
      includeGl
    } = req.query;
    const { page, limit, offset } = normalizePagination(req.query, 10, 500);

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { invoiceNumber: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { '$tenant.name$': { [Op.like]: `%${search}%` } },
        { '$lease.tenant.name$': { [Op.like]: `%${search}%` } },
        { '$lease.unit.unitNumber$': { [Op.like]: `%${search}%` } },
        { '$lease.unit.property.title$': { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (leaseId) whereClause.leaseId = leaseId;
    if (tenantId) whereClause.tenantId = tenantId;
    // Open AR: everything except paid/cancelled (draft + sent + overdue)
    if (openOnly === 'true' || openOnly === true) {
      whereClause.status = { [Op.notIn]: ['paid', 'cancelled'] };
    } else if (dueOnly === 'true' || dueOnly === true) {
      // dueOnly: invoices not paid (sent or overdue) - same as "pending for payment"
      whereClause.status =
        status && ['sent', 'overdue'].includes(status)
          ? status
          : { [Op.in]: ['sent', 'overdue'] };
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

    const orderDue =
      openOnly === 'true' || openOnly === true
        ? [['due_date', 'ASC']]
        : dueOnly === 'true' || dueOnly === true
          ? [['due_date', 'ASC']]
          : [['created_at', 'DESC']];

    const includeList = [
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
    ];

    if (includeGl === 'true' || includeGl === true) {
      includeList.push({
        model: AccountsTrans,
        as: 'accountingEntries',
        required: false,
        include: [
          {
            model: ChartOfAccount,
            as: 'ledger',
            attributes: ['id', 'accountCode', 'accountName', 'accountType'],
            required: false
          }
        ]
      });
    }

    const invoices = await Invoice.findAndCountAll({
      where: whereClause,
      distinct: true,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: orderDue,
      include: includeList
    });

    res.json({
      success: true,
      data: {
        invoices: invoices.rows,
        pagination: createPaginationMeta(invoices.count, page, limit)
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

    // Enrich details with ledger info for printing
    if (invoice.details) {
      const details = typeof invoice.details === 'string' ? JSON.parse(invoice.details) : invoice.details;
      if (Array.isArray(details)) {
        const enrichedDetails = await Promise.all(details.map(async (d) => {
          const ledgerId = d.ledgerId || d.ledger;
          if (ledgerId) {
            const ledger = await ChartOfAccount.findByPk(ledgerId);
            return { ...d, ledger };
          }
          return d;
        }));
        invoice.setDataValue('details', enrichedDetails);
      }
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
  const transaction = await sequelize.transaction();
  try {
    const invoiceData = req.body;
    const { selectedPDC } = invoiceData; // Extract selected PDCs
    
    // Generate invoice number
    const generatedNumber = await documentNumberingService.generateDocumentNumber('Receipt Invoice', transaction);
    
    if (generatedNumber) {
        invoiceData.invoiceNumber = generatedNumber;
    } else {
        const invoiceCount = await Invoice.count({ transaction });
        invoiceData.invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(3, '0')}`;
    }

    const invoice = await Invoice.create(invoiceData, { transaction });

    // Update Property Actual Revenue
    if (invoice.status === 'paid' && invoice.leaseId) {
      await updatePropertyActualRevenue(invoice.leaseId);
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
            },
            transaction 
          }
        );
      }

      // 2. Create New Virtual Cheques
      if (newCheques.length > 0) {
          await Cheque.bulkCreate(newCheques, { transaction });
      }
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
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
    
    if ((oldStatus === 'paid' || newStatus === 'paid') && invoice.leaseId) {
      await updatePropertyActualRevenue(invoice.leaseId);
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
      await updatePropertyActualRevenue(invoice.leaseId);
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

function pickInvoiceCell(row, ...keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
    const lower = Object.keys(row).find((x) => x.toLowerCase() === String(k).toLowerCase());
    if (lower && row[lower] !== undefined && row[lower] !== '') return row[lower];
  }
  return undefined;
}

const downloadTenantInvoiceImportTemplate = async (req, res, next) => {
  try {
    const XLSX = require('xlsx');
    const rows = [
      {
        'Invoice Number': 'INV-SAMPLE-001',
        'Lease ID': 1,
        'Tenant ID': 1,
        'Invoice Date': '2026-01-15',
        'Due Date': '2026-02-15',
        Subtotal: 5000,
        'Tax Rate': 0,
        'Tax Amount': 0,
        'Total Amount': 5000,
        Description:
          'Required: Invoice Number, Lease ID, Tenant ID (must match lease), dates, amounts.'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tenant Invoices');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=tenant_invoice_import_template.xlsx'
    );
    res.send(buf);
  } catch (error) {
    next(error);
  }
};

const exportTenantInvoices = async (req, res, next) => {
  try {
    const XLSX = require('xlsx');
    const {
      search = '',
      leaseId = '',
      tenantId = '',
      status = '',
      openOnly = 'true',
      includeGl = 'true'
    } = req.query;

    const whereClause = {};
    if (openOnly === 'true' || openOnly === true) {
      whereClause.status = { [Op.notIn]: ['paid', 'cancelled'] };
    }
    if (status) whereClause.status = status;
    if (leaseId) whereClause.leaseId = leaseId;
    if (tenantId) whereClause.tenantId = tenantId;
    if (search) {
      whereClause[Op.or] = [
        { invoiceNumber: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const includeList = [
      {
        model: Lease,
        as: 'lease',
        include: [
          { association: 'tenant' },
          { association: 'unit', include: ['property'] }
        ]
      },
      { model: Tenant, as: 'tenant' }
    ];

    if (includeGl === 'true' || includeGl === true) {
      includeList.push({
        model: AccountsTrans,
        as: 'accountingEntries',
        required: false,
        include: [
          {
            model: ChartOfAccount,
            as: 'ledger',
            attributes: ['accountCode', 'accountName'],
            required: false
          }
        ]
      });
    }

    const invoices = await Invoice.findAll({
      where: whereClause,
      include: includeList,
      order: [['dueDate', 'ASC']]
    });

    const flat = invoices.map((inv) => {
      const v = inv.toJSON ? inv.toJSON() : inv;
      const entries = v.accountingEntries || [];
      const glSummary = entries
        .map((e) => {
          const code = e.ledger?.accountCode || '';
          const name = e.ledger?.accountName || '';
          const dr = parseFloat(e.debitAmount || 0);
          const cr = parseFloat(e.creditAmount || 0);
          if (!code && !name && !dr && !cr) return '';
          return `${code} ${name}`.trim() + (dr ? ` Dr:${dr}` : '') + (cr ? ` Cr:${cr}` : '');
        })
        .filter(Boolean)
        .join(' | ');
      return {
        'Invoice Number': v.invoiceNumber,
        'Lease ID': v.leaseId,
        'Tenant ID': v.tenantId,
        Tenant: v.tenant?.name || '',
        Property: v.lease?.unit?.property?.title || '',
        Unit: v.lease?.unit?.unitNumber || '',
        'Invoice Date': v.invoiceDate ? new Date(v.invoiceDate).toISOString().slice(0, 10) : '',
        'Due Date': v.dueDate ? new Date(v.dueDate).toISOString().slice(0, 10) : '',
        Subtotal: parseFloat(v.subtotal || 0),
        'Tax Amount': parseFloat(v.taxAmount || 0),
        'Total Amount': parseFloat(v.totalAmount || 0),
        Status: v.status,
        Description: v.description || '',
        'GL Lines': glSummary
      };
    });

    const ws = XLSX.utils.json_to_sheet(flat.length ? flat : [{ Note: 'No rows' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Export');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=tenant_invoices_export.xlsx');
    res.send(buf);
  } catch (error) {
    next(error);
  }
};

const importTenantInvoices = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Missing file upload (field name: file)'
      });
    }

    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    const results = { created: 0, errors: [] };

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNum = i + 2;
      try {
        const invoiceNumber = String(
          pickInvoiceCell(row, 'Invoice Number', 'invoice_number') || ''
        ).trim();
        const leaseId = pickInvoiceCell(row, 'Lease ID', 'lease_id');
        const tenantId = pickInvoiceCell(row, 'Tenant ID', 'tenant_id');
        const invoiceDate = pickInvoiceCell(row, 'Invoice Date', 'invoice_date');
        const dueDate = pickInvoiceCell(row, 'Due Date', 'due_date');
        const subtotal = parseFloat(pickInvoiceCell(row, 'Subtotal', 'subtotal') || 0);
        const taxRate = parseFloat(pickInvoiceCell(row, 'Tax Rate', 'tax_rate') || 0);
        const taxAmount = parseFloat(pickInvoiceCell(row, 'Tax Amount', 'tax_amount') || 0);
        const totalAmount = parseFloat(pickInvoiceCell(row, 'Total Amount', 'total_amount') || 0);
        const description = pickInvoiceCell(row, 'Description', 'description') || null;

        if (!invoiceNumber || !leaseId || !tenantId || !invoiceDate || !dueDate) {
          results.errors.push({
            row: rowNum,
            message:
              'Missing required columns: Invoice Number, Lease ID, Tenant ID, Invoice Date, Due Date'
          });
          continue;
        }

        const exists = await Invoice.findOne({ where: { invoiceNumber } });
        if (exists) {
          results.errors.push({
            row: rowNum,
            message: `Duplicate invoice number ${invoiceNumber}`
          });
          continue;
        }

        const lease = await Lease.findByPk(parseInt(leaseId, 10));
        if (!lease) {
          results.errors.push({ row: rowNum, message: `Lease ${leaseId} not found` });
          continue;
        }
        if (parseInt(lease.tenantId, 10) !== parseInt(tenantId, 10)) {
          results.errors.push({
            row: rowNum,
            message: `Tenant ${tenantId} does not match lease ${leaseId}`
          });
          continue;
        }

        let total = totalAmount;
        if (!total || total <= 0) {
          total = subtotal + taxAmount;
        }

        await Invoice.create({
          invoiceNumber,
          leaseId: parseInt(leaseId, 10),
          tenantId: parseInt(tenantId, 10),
          invoiceDate: new Date(invoiceDate),
          dueDate: new Date(dueDate),
          subtotal: subtotal || Math.max(0, total - taxAmount),
          taxRate: taxRate || 0,
          taxAmount: taxAmount || 0,
          totalAmount: total,
          status: 'draft',
          description
        });
        results.created += 1;
      } catch (err) {
        results.errors.push({ row: rowNum, message: err.message || String(err) });
      }
    }

    res.status(200).json({
      success: true,
      message: `Imported ${results.created} tenant invoice(s)`,
      data: results
    });
  } catch (error) {
    next(error);
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
  updatePropertyActualRevenue,
  downloadTenantInvoiceImportTemplate,
  exportTenantInvoices,
  importTenantInvoices
};

/**
 * Helper to update property actual revenue based on invoice changes
 * Recalculates total from all paid invoices to ensure consistency
 * @param {number} leaseId - The lease ID associated with the invoice
 */
/**
 * Helper to update property actual revenue based on invoice changes
 * Recalculates total from all paid invoices for a property to ensure consistency
 * @param {number|object} identifier - Either a leaseId (number) or an object { leaseId, propertyId }
 */
async function updatePropertyActualRevenue(identifier) {
  try {
    const { Lease, Unit, Property, Invoice } = require('../models');
    let propertyId = typeof identifier === 'object' ? identifier.propertyId : null;
    let leaseId = typeof identifier === 'object' ? identifier.leaseId : (typeof identifier === 'number' ? identifier : null);

    let property = null;

    if (propertyId) {
      property = await Property.findByPk(propertyId);
    } else if (leaseId) {
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
        property = lease.unit.property;
        propertyId = property.id;
      }
    }

    if (property) {
      // Calculate total paid revenue for this property
      const paidInvoices = await Invoice.findAll({
        where: { status: 'paid' },
        include: [{
          model: Lease,
          as: 'lease',
          required: true,
          include: [{
            model: Unit,
            as: 'unit',
            required: true,
            where: { propertyId: property.id }
          }]
        }]
      });

      const totalRevenue = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || 0), 0);
      console.log(`DEBUG: Found ${paidInvoices.length} paid invoices for property ${property.id}. Total: ${totalRevenue}`);
      
      await property.update({
        actualRevenue: totalRevenue
      });
      console.log(`✅ Recalculated Property ${property.id} (${property.title}) actual revenue. New total: ${totalRevenue}`);
    } else {
      console.log(`DEBUG: Property not found for identifier: ${JSON.stringify(identifier)}`);
    }
  } catch (error) {
    console.error('❌ Error updating property actual revenue:', error);
  }
}
