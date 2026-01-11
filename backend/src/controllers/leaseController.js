const { Lease, Tenant, Unit, Payment, Invoice, FinancialTransaction, sequelize } = require('../models');
const { Op } = require('sequelize');

// Get all leases
const getAllLeases = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status, tenantId, unitId } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { leaseNumber: { [Op.like]: `%${search}%` } },
        { terms: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (tenantId) whereClause.tenantId = tenantId;
    if (unitId) whereClause.unitId = unitId;

    const leases = await Lease.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Tenant,
          as: 'tenant'
        },
        {
          model: Unit,
          as: 'unit',
          include: ['property']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        leases: leases.rows,
        pagination: {
          total: leases.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(leases.count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get lease by ID
const getLeaseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lease = await Lease.findByPk(id, {
      include: [
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
          model: Payment,
          as: 'payments',
          limit: 10,
          order: [['created_at', 'DESC']]
        },
        {
          model: Invoice,
          as: 'invoices',
          limit: 10,
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!lease) {
      return res.status(404).json({
        success: false,
        message: 'Lease not found'
      });
    }

    res.json({
      success: true,
      data: lease
    });
  } catch (error) {
    next(error);
  }
};

// Create new lease
const createLease = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const leaseData = req.body;
    
    // Generate lease number
    const leaseCount = await Lease.count();
    leaseData.leaseNumber = `L-${new Date().getFullYear()}-${String(leaseCount + 1).padStart(3, '0')}`;
    
    const lease = await Lease.create(leaseData, { transaction });

    // Auto-generate invoices if lease is active
    if (lease.status === 'active') {
      await generateLeaseInvoices(lease, transaction);
      
      // Record expected revenue in financial transactions
      await recordExpectedRevenue(lease, transaction);
    }

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Lease created successfully with auto-generated invoices',
      data: lease
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Generate invoices for a lease based on payment schedule
 */
async function generateLeaseInvoices(lease, transaction) {
  const { 
    id: leaseId, 
    tenantId, 
    startDate, 
    endDate, 
    monthlyRent,
    paymentFrequency = 'monthly',
    taxRate = 5
  } = lease;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const invoices = [];

  // Calculate number of payments based on frequency
  let paymentInterval, paymentAmount;
  switch (paymentFrequency) {
    case 'monthly':
      paymentInterval = 1; // months
      paymentAmount = monthlyRent;
      break;
    case 'quarterly':
      paymentInterval = 3;
      paymentAmount = monthlyRent * 3;
      break;
    case 'semi_annual':
      paymentInterval = 6;
      paymentAmount = monthlyRent * 6;
      break;
    case 'annual':
      paymentInterval = 12;
      paymentAmount = monthlyRent * 12;
      break;
    default:
      paymentInterval = 1;
      paymentAmount = monthlyRent;
  }

  // Generate invoices for each period
  let currentDate = new Date(start);
  let invoiceNumber = 1;

  while (currentDate < end) {
    const dueDate = new Date(currentDate);
    dueDate.setMonth(dueDate.getMonth() + paymentInterval);
    
    // Don't exceed lease end date
    if (dueDate > end) {
      dueDate.setTime(end.getTime());
      
      // Calculate prorated amount if partial period
      const fullPeriodDays = paymentInterval * 30;
      const actualDays = Math.ceil((dueDate - currentDate) / (1000 * 60 * 60 * 24));
      paymentAmount = (monthlyRent / 30) * actualDays;
    }

    const subtotal = parseFloat(paymentAmount);
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;

    const invoice = await Invoice.create({
      invoiceNumber: `${lease.leaseNumber}-${String(invoiceNumber).padStart(2, '0')}`,
      leaseId,
      tenantId,
      invoiceDate: currentDate,
      dueDate,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      status: 'pending',
      description: `Rent payment for ${paymentFrequency} period`
    }, { transaction });

    invoices.push(invoice);
    invoiceNumber++;
    
    // Move to next period
    currentDate = new Date(dueDate);
  }

  return invoices;
}

/**
 * Record expected revenue from lease in financial transactions
 */
async function recordExpectedRevenue(lease, transaction) {
  const unit = await Unit.findByPk(lease.unitId);
  
  if (!unit) return;

  // Calculate total expected revenue
  const start = new Date(lease.startDate);
  const end = new Date(lease.endDate);
  const months = Math.ceil((end - start) / (1000 * 60 * 60 * 24 * 30));
  const totalRevenue = lease.monthlyRent * months;

  // Record in financial transactions
  await FinancialTransaction.create({
    transactionDate: lease.startDate,
    transactionType: 'credit',
    amount: totalRevenue,
    description: `Expected revenue from lease ${lease.leaseNumber}`,
    category: 'Rental Income',
    referenceType: 'lease',
    referenceId: lease.id,
    propertyId: unit.propertyId,
    accountId: null, // Should be linked to Rental Income account
    status: 'pending'
  }, { transaction });
}

// Update lease
const updateLease = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const lease = await Lease.findByPk(id);
    if (!lease) {
      return res.status(404).json({
        success: false,
        message: 'Lease not found'
      });
    }

    await lease.update(updateData);

    res.json({
      success: true,
      message: 'Lease updated successfully',
      data: lease
    });
  } catch (error) {
    next(error);
  }
};

// Delete lease
const deleteLease = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lease = await Lease.findByPk(id);

    if (!lease) {
      return res.status(404).json({
        success: false,
        message: 'Lease not found'
      });
    }

    await lease.destroy();

    res.json({
      success: true,
      message: 'Lease deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get lease statistics
const getLeaseStats = async (req, res, next) => {
  try {
    const totalLeases = await Lease.count();
    const activeLeases = await Lease.count({ where: { status: 'active' } });
    const expiredLeases = await Lease.count({ where: { status: 'expired' } });
    const draftLeases = await Lease.count({ where: { status: 'draft' } });

    res.json({
      success: true,
      data: {
        total: totalLeases,
        active: activeLeases,
        expired: expiredLeases,
        draft: draftLeases
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get expiring leases
const getExpiringLeases = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));

    const expiringLeases = await Lease.findAll({
      where: {
        status: 'active',
        endDate: {
          [Op.lte]: futureDate
        }
      },
      include: [
        {
          model: Tenant,
          as: 'tenant'
        },
        {
          model: Unit,
          as: 'unit',
          include: ['property']
        }
      ],
      order: [['endDate', 'ASC']]
    });

    res.json({
      success: true,
      data: expiringLeases
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllLeases,
  getLeaseById,
  createLease,
  updateLease,
  deleteLease,
  getLeaseStats,
  getExpiringLeases
};
