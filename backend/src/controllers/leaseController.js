const { Lease, Tenant, Unit, Payment, Invoice, FinancialTransaction, Property, Cheque, ChartOfAccount, sequelize, CompanySetting } = require('../models');
const { getAuthorityLabelsForProperty } = require('../utils/emirateAuthorityMap');
const Service = require('../models/Service');
const documentNumberingService = require('../services/documentNumberingService');
const { createMailTransport, buildLeaseRenewalNoticeTemplate } = require('../services/leaseExpiryNoticeService');
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');

async function findBlockingActiveLeaseForUnit(unitId, transaction, excludeLeaseId = null) {
  if (!unitId) return null;

  const where = {
    unitId,
    status: 'active',
  };

  if (excludeLeaseId) {
    where.id = { [Op.ne]: excludeLeaseId };
  }

  return Lease.findOne({ where, transaction });
}

async function clearStaleOccupiedStatus(unit, transaction) {
  if (!unit) return;
  if (String(unit.status || '').toLowerCase() !== 'occupied') return;

  await unit.update({ status: 'available' }, { transaction });
}

async function resolveLeaseNumber(rawNumber, unitId, transaction) {
  const generatedNumber = await documentNumberingService.generateDocumentNumber('Lease', transaction, {
    unitId,
  });

  if (generatedNumber) {
    return generatedNumber;
  }

  const manualNumber = documentNumberingService.normalizeManualDocumentNumber(rawNumber);
  if (!manualNumber) {
    const error = new Error('Document numbering is disabled for Lease. Please enter the lease number manually.');
    error.statusCode = 400;
    throw error;
  }

  const existingLease = await Lease.findOne({
    where: { leaseNumber: manualNumber },
    transaction
  });

  if (existingLease) {
    const error = new Error(`Lease number '${manualNumber}' already exists.`);
    error.statusCode = 400;
    throw error;
  }

  return manualNumber;
}

// Get analytics data
const getAnalytics = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const currentYear = parseInt(year) || new Date().getFullYear();
    
    // Date range for filtering
    let startDate, endDate;
    if (month && month !== 'all') {
      startDate = new Date(currentYear, parseInt(month) - 1, 1);
      endDate = new Date(currentYear, parseInt(month), 0, 23, 59, 59);
    } else {
      startDate = new Date(currentYear, 0, 1);
      endDate = new Date(currentYear, 11, 31, 23, 59, 59);
    }

    // 1. Total Revenue (Collected from Payments)
    const revenueResult = await Payment.sum('amount', {
      where: {
        status: 'paid',
        paymentDate: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    const totalCollectedRevenue = revenueResult || 0;

    // 2. Total Annual Rent (Contract Value of Active Leases)
    const rentResult = await Lease.sum('rentAmount', { where: { status: 'active' } });
    const totalAnnualRent = rentResult || 0;

    // 3. Lease Status Breakdown
    const statusCounts = await Lease.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status']
    });
    
    const statusStats = {
      active: 0,
      pending: 0,
      terminated: 0,
      expired: 0,
      draft: 0
    };

    statusCounts.forEach(item => {
      const s = item.getDataValue('status').toLowerCase();
      const c = parseInt(item.getDataValue('count'));
      if (statusStats[s] !== undefined) statusStats[s] += c;
    });

    const activeLeasesCount = statusStats.active;
    const totalLeasesCount = Object.values(statusStats).reduce((a, b) => a + b, 0);

    // 4. Monthly Trend (Collected vs Pending)
    const trendStartDate = new Date(currentYear, 0, 1);
    const trendEndDate = new Date(currentYear, 11, 31, 23, 59, 59);
    
    // A. Collected Revenue (from Payments)
    const monthlyCollectedRaw = await Payment.findAll({
      attributes: [
        [sequelize.fn('MONTH', sequelize.col('payment_date')), 'month'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'revenue']
      ],
      where: {
        status: 'paid',
        paymentDate: {
          [Op.between]: [trendStartDate, trendEndDate]
        }
      },
      group: [sequelize.fn('MONTH', sequelize.col('payment_date'))],
      order: [[sequelize.col('month'), 'ASC']]
    });

    // B. Pending Revenue (from Unpaid Invoices)
    // We look for invoices due in this year that are NOT paid
    const monthlyPendingRaw = await Invoice.findAll({
      attributes: [
        [sequelize.fn('MONTH', sequelize.col('due_date')), 'month'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'revenue']
      ],
      where: {
        status: { [Op.ne]: 'paid' }, // 'ne' means Not Equal
        dueDate: {
          [Op.between]: [trendStartDate, trendEndDate]
        }
      },
      group: [sequelize.fn('MONTH', sequelize.col('due_date'))],
      order: [[sequelize.col('month'), 'ASC']]
    });

    // Format trend data by merging both sources
    const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const collected = monthlyCollectedRaw.find(r => r.getDataValue('month') === monthNum);
      const pending = monthlyPendingRaw.find(r => r.getDataValue('month') === monthNum);
      
      return {
        month: new Date(currentYear, i, 1).toLocaleDateString('en-US', { month: 'short' }),
        collected: collected ? parseFloat(collected.getDataValue('revenue')) : 0,
        pending: pending ? parseFloat(pending.getDataValue('revenue')) : 0
      };
    });

    // 5. Compliance Alerts (Active Leases ONLY)
    const activeLeases = await Lease.findAll({ 
      where: { status: 'active' },
      attributes: ['id', 'leaseNumber', 'compliance'],
      include: [{ 
        model: Unit, 
        as: 'unit', 
        attributes: ['unitNumber'],
        include: [{ model: Property, as: 'property', attributes: ['title', 'emirate', 'location'] }]
      }]
    });

    const companySettings = await CompanySetting.findOne({ order: [['id', 'ASC']] });
    const mapRaw = companySettings?.emirateAuthorityMap ?? null;
    const contractTerminology =
      companySettings?.contractTerminology || 'Ejari';

    const complianceIssues = [];
    const complianceStats = {
      ejari: 0, dewa: 0, municipality: 0, insurance: 0, fireSafety: 0, maintenance: 0, totalActive: activeLeases.length
    };

    activeLeases.forEach(lease => {
      const issues = [];
      const comp = lease.compliance || {};
      const prop = lease.unit?.property;
      const labels = getAuthorityLabelsForProperty(
        prop ? { emirate: prop.emirate, location: prop.location } : null,
        mapRaw,
        contractTerminology,
      );

      if (!comp.ejariRegistered) issues.push(`${labels.attestationAuthority} Registration`);
      else complianceStats.ejari++;

      if (!comp.dewaConnected) issues.push(`${labels.electricity} Connection`);
      else complianceStats.dewa++;

      if (!comp.municipalityRegistered) issues.push('Municipality Registration');
      else complianceStats.municipality++;

      if (!comp.insuranceValid) issues.push('Insurance Validity');
      else complianceStats.insurance++;

      if (!comp.fireSafety) issues.push('Fire Safety Check');
      else complianceStats.fireSafety++;

      if (!comp.maintenanceUpToDate) issues.push('Maintenance Check');
      else complianceStats.maintenance++;

      if (issues.length > 0) {
        complianceIssues.push({
          id: lease.id,
          leaseNumber: lease.leaseNumber,
          unit: lease.unit ? `${lease.unit.property?.title || 'Unknown'} - ${lease.unit.unitNumber}` : 'N/A',
          issues
        });
      }
    });

    // 6. Occupancy
    const totalUnits = await Unit.count();
    const occupancyRate = totalUnits > 0 ? (activeLeasesCount / totalUnits) * 100 : 0;

    // 4. Calculate Expected Monthly Revenue for Selected Month
    // Find leases that are active during the selected month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    const activeMonthlyLeases = await Lease.findAll({
      where: {
        status: 'active',
        startDate: { [Op.lte]: endOfMonth },
        endDate: { [Op.gte]: startOfMonth }
      },
      attributes: ['id', 'leaseNumber', 'rentAmount'], // Assuming rentAmount is MONTHLY rent
      include: [{ model: Tenant, as: 'tenant', attributes: ['name'] }]
    });

    const totalMonthlyRevenue = activeMonthlyLeases.reduce((sum, lease) => {
      return sum + (parseFloat(lease.rentAmount) || 0);
    }, 0);

    const leaseRevenueBreakdown = activeMonthlyLeases.map(lease => ({
      leaseNumber: lease.leaseNumber,
      tenantName: lease.tenant?.name || 'Unknown',
      rent: parseFloat(lease.rentAmount) || 0
    }));

    // ... existing aggregations ...

    res.json({
      success: true,
      data: {
        leases: activeLeases, // Detailed list if needed
        stats: {
          totalRevenue: totalCollectedRevenue, // Historical collected
          totalExpectedRevenue: totalMonthlyRevenue, // Projected for selected month
          totalAnnualRent,
          occupancyRate,
          activeLeasesCount,
          totalLeasesCount
        },
        monthlyTrend, // Keep for historical context if needed, or remove if user only wants the bar chart
        leaseRevenueBreakdown, // NEW: For the Bar Chart
        compliance: complianceStats,
        complianceIssues,
        statusStats
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get all leases
const getAllLeases = async (req, res, next) => {
  try {
    const { 
      search, 
      status, 
      ejariStatus, 
      paymentStatus, 
      propertyId,
      tenantId, 
      unitId, 
      sortBy = 'created_at', 
      sortOrder = 'DESC' 
    } = req.query;
    
    // Normalize pagination with max limit enforcement
    const { page, limit, offset } = normalizePagination(req.query, 10, 100);

    const whereClause = {};
    
    // 1. Search Logic
    if (search) {
      const searchLower = `%${search.toLowerCase()}%`;
      whereClause[Op.or] = [
        sequelize.where(sequelize.fn('LOWER', sequelize.col('lease_number')), 'LIKE', searchLower),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('terms')), 'LIKE', searchLower),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('tenant.name')), 'LIKE', searchLower),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('tenant.email')), 'LIKE', searchLower),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('tenant.phone')), 'LIKE', searchLower),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('tenant.company')), 'LIKE', searchLower),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('unit.unit_number')), 'LIKE', searchLower),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('unit->property.title')), 'LIKE', searchLower),
        sequelize.where(sequelize.fn('LOWER', sequelize.col('unit->property.location')), 'LIKE', searchLower)
      ];
    }

    // 2. Filter Logic
    if (status && status !== 'All') {
      const statusLower = status.toLowerCase();
      if (statusLower === 'expiring') {
        whereClause.status = 'active';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const ninetyDaysOut = new Date(today);
        ninetyDaysOut.setDate(ninetyDaysOut.getDate() + 90);
        whereClause.endDate = { [Op.between]: [today, ninetyDaysOut] };
      } else if (statusLower === 'pending') {
        whereClause.status = 'draft';
      } else {
        whereClause.status = statusLower;
      }
    }
    if (ejariStatus && ejariStatus !== 'All') whereClause.ejariStatus = ejariStatus.toLowerCase();
    // paymentStatus filter skipped — column does not exist in Lease model yet
    
    if (tenantId) whereClause.tenantId = tenantId;
    if (unitId) whereClause.unitId = unitId;
    if (propertyId && propertyId !== 'All') whereClause['$unit.property_id$'] = propertyId;

    // 3. Sorting Logic
    let order = [['created_at', 'DESC']]; // Default
    
    switch (sortBy) {
      case 'Lease Number': order = [['leaseNumber', sortOrder]]; break;
      case 'Tenant Name': order = [[{ model: Tenant, as: 'tenant' }, 'name', sortOrder]]; break;
      case 'Start Date': order = [['startDate', sortOrder]]; break;
      case 'End Date': order = [['endDate', sortOrder]]; break;
      case 'Rent Amount': order = [['rentAmount', sortOrder]]; break;
      case 'Status': order = [['status', sortOrder]]; break;
      default:
        if (sortBy && sortBy !== 'created_at') order = [[sortBy, sortOrder]];
    }

    const { count, rows } = await Lease.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: order,
      distinct: true,
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'email', 'phone', 'nationality', 'emiratesId', 'company']
        },
        {
          model: Unit,
          as: 'unit',
          include: [{ model: Property, as: 'property', attributes: ['id', 'title', 'location', 'emirate', 'type'] }]
        }
      ]
    });

    res.json({
      success: true,
      data: {
        leases: rows,
        pagination: createPaginationMeta(count, page, limit)
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

    // Fetch associated services
    const services = await Service.findAll({
      where: {
        entityType: 'lease',
        entityId: id,
        isActive: true
      },
      order: [['sortOrder', 'ASC'], ['created_at', 'ASC']]
    });

    // Add services to lease data
    const leaseData = lease.toJSON();
    leaseData.services = services;

    res.json({
      success: true,
      data: leaseData
    });
  } catch (error) {
    next(error);
  }
};

// Create new lease
const createLease = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Parse lease data (handle FormData vs JSON)
    let leaseData = req.body.data ? JSON.parse(req.body.data) : req.body;
    
    // Handle file uploads
    if (req.files && req.files.length > 0) {
      const uploadedDocs = req.files.map(file => `/uploads/leases/${file.filename}`);
      
      // Initialize documents array if it doesn't exist
      if (!leaseData.documents) {
        leaseData.documents = [];
      } else if (typeof leaseData.documents === 'string') {
        try {
          leaseData.documents = JSON.parse(leaseData.documents);
        } catch (e) {
          leaseData.documents = [];
        }
      }
      
      // Append new files
      leaseData.documents = [...leaseData.documents, ...uploadedDocs];
    }

    const { renewedFromLeaseId } = leaseData; // Extract renewal source ID

    // [VALIDATION] Check if unit is not locked by legal case and not already under an active lease
    if (leaseData.unitId) {
      const unit = await Unit.findByPk(leaseData.unitId, { transaction });
      if (unit) {
        const status = (unit.status || 'available').toLowerCase();
        if (['dispute', 'npa', 'case'].includes(status)) {
          await transaction.rollback();
          const statusLabels = { 'dispute': 'Dispute', 'npa': 'NPA', 'case': 'Ongoing Case' };
          return res.status(400).json({
            success: false,
            message: `Selected unit is locked due to an active legal case status: ${statusLabels[status] || status}.`
          });
        }

        const blockingLease = await findBlockingActiveLeaseForUnit(leaseData.unitId, transaction);
        if (blockingLease) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Selected unit is currently occupied. Please terminate the existing active lease before creating a new one.'
          });
        }

        await clearStaleOccupiedStatus(unit, transaction);
      }
    }

    // Handle Renewal Logic: Close old lease if this is a renewal
    if (renewedFromLeaseId) {
      console.log(`[LeaseRenewal] Processing renewal from Lease ID: ${renewedFromLeaseId}`);
      const oldLease = await Lease.findByPk(renewedFromLeaseId, { transaction });

      if (oldLease) {
        // Update old lease status to 'renewed' and mark as inactive
        await oldLease.update({
          status: 'renewed',
          isActive: false, // Make it read-only/inactive
          renewalTerms: `Renewed on ${new Date().toISOString().split('T')[0]}` 
        }, { transaction });
        console.log(`[LeaseRenewal] Old lease ${oldLease.leaseNumber} marked as renewed.`);
      } else {
        console.warn(`[LeaseRenewal] Warning: Old lease ID ${renewedFromLeaseId} not found.`);
      }
    }
    
    // Fix: leaseType is now handled by the model directly
    // Property type is separate
    if (leaseData.property && leaseData.property.type) {
      leaseData.propertyType = leaseData.property.type;
    }
    
    // Sanitize dates
    if (leaseData.pdcStartDate === "") leaseData.pdcStartDate = null;
    
    leaseData.leaseNumber = await resolveLeaseNumber(leaseData.leaseNumber, leaseData.unitId, transaction);
    
    // [FIX] Explicitly handle isRentalTaxable to prevent data type issues
    if (leaseData.isRentalTaxable !== undefined) {
       console.log(`[LeaseController] Received isRentalTaxable: ${leaseData.isRentalTaxable} (Type: ${typeof leaseData.isRentalTaxable})`);
       leaseData.isRentalTaxable = leaseData.isRentalTaxable === true || leaseData.isRentalTaxable === 'true';
    }
    
    const lease = await Lease.create(leaseData, { transaction });

    // [FIX] Save Services from Frontend Payload (prioritize over Unit defaults if provided)
    // This allows user edits (add/remove/change amount) to be saved
    let servicesData = leaseData.services;
    console.log('[LeaseController] Received services payload:', JSON.stringify(servicesData, null, 2));
    
    // If frontend didn't send services (or sent empty), fallback to fetching from Unit
    if (!servicesData || (Array.isArray(servicesData) && servicesData.length === 0)) {
       console.log('[LeaseController] No services in payload, checking unit...');
       if (leaseData.unitId) {
          const unitServices = await Service.findAll({
            where: {
              entityType: 'unit',
              entityId: leaseData.unitId,
              isActive: true
            },
            order: [['sortOrder', 'ASC']],
            transaction
          });
          
          if (unitServices.length > 0) {
             console.log(`[LeaseController] Found ${unitServices.length} default unit services`);
             servicesData = unitServices.map(s => ({
                name: s.name,
                amount: s.amount,
                isTaxable: s.isTaxable,
                billingMethod: s.billingMethod,
                entityType: 'lease',
                entityId: lease.id,
                description: s.description,
                sortOrder: s.sortOrder,
                isActive: true
             }));
          }
       }
    } else {
        // Prepare frontend services for creation
        // Ensure entityType/ID are correct for the new lease
         if (typeof servicesData === 'string') {
            try { servicesData = JSON.parse(servicesData); } catch(e) { servicesData = [] }
         }
         
         servicesData = servicesData.map((s, index) => ({
             ...s,
             id: undefined, // Create new records
             entityType: 'lease',
             entityId: lease.id,
             // Ensure defaults
             isTaxable: s.isTaxable === true || s.isTaxable === 'true',
             isActive: true,
             sortOrder: index
         }));
    }

    // Bulk create services
    if (servicesData && servicesData.length > 0) {
         await Service.bulkCreate(servicesData, { transaction });
         console.log(`[LeaseCreation] Created ${servicesData.length} services for lease ${lease.leaseNumber}`);
    }

    // [FIX] Save PDC Schedule as Cheques
    let pdcSchedule = leaseData.pdcSchedule;
    if (typeof pdcSchedule === 'string') {
        try {
            pdcSchedule = JSON.parse(pdcSchedule);
        } catch (e) {
            console.error("Failed to parse pdcSchedule in createLease:", e);
            pdcSchedule = [];
        }
    }

    if (pdcSchedule && Array.isArray(pdcSchedule) && pdcSchedule.length > 0) {
      const userId = req.user?.id || 1;
      const validPDCs = [];

      for (const pdc of pdcSchedule) {
         // Validation: Provide defaults for missing fields
         const chequeNo = pdc.chequeNumber || 'Pending';
         const bank = pdc.bankName || 'Pending';

         validPDCs.push({
            chequeNumber: chequeNo,
            bankName: bank,
            amount: parseFloat(pdc.amount || 0),
            chequeDate: pdc.dueDate || pdc.date || pdc.chequeDate || new Date(), // Prioritize dueDate
            chequeType: 'pdc', 
            status: 'pending',
            tenantId: lease.tenantId,
            leaseId: lease.id,
            currency: 'AED',
            createdBy: userId,
            isActive: true
         });
      }

      if (validPDCs.length > 0) {
         await Cheque.bulkCreate(validPDCs, { transaction });
         console.log(`[LeaseCreation] Created ${validPDCs.length} PDCs for lease ${lease.leaseNumber}`);
      }
    }

    // Auto-generate invoices if lease is active
    if (lease.status === 'active') {
      await generateLeaseInvoices(lease, transaction);
      
      // Record expected revenue in financial transactions
      await recordExpectedRevenue(lease, transaction, req.user?.id || 1);
    }
    
    // Update Unit details if property info is provided
    console.log('DEBUG: Checking Unit Update. UnitID:', leaseData.unitId, 'Property Data:', JSON.stringify(leaseData.property));

    if (leaseData.unitId && leaseData.property) {
      const unit = await Unit.findByPk(leaseData.unitId, { transaction });
      if (unit) {
        const updates = {};
        if (leaseData.property.area) updates.area = leaseData.property.area;
        if (leaseData.property.bedrooms !== undefined) updates.bedrooms = leaseData.property.bedrooms;
        if (leaseData.property.bathrooms !== undefined) updates.bathrooms = leaseData.property.bathrooms;
        if (leaseData.property.parking !== undefined) updates.parking = leaseData.property.parking;
        
        console.log('DEBUG: Proposed Unit Updates:', JSON.stringify(updates));

        if (Object.keys(updates).length > 0) {
          await unit.update(updates, { transaction });
          console.log('DEBUG: Unit updated successfully');
        } else {
             console.log('DEBUG: No updates to apply');
        }
      } else {
          console.log('DEBUG: Unit not found');
      }
    } else {
        console.log('DEBUG: Missing unitId or property object');
    }

    // [New Logic]: If lease is created as active, mark unit as occupied
    if (lease.status === 'active' && leaseData.unitId) {
       const unit = await Unit.findByPk(leaseData.unitId, { transaction });
       if (unit) {
         await unit.update({ status: 'occupied' }, { transaction });
         console.log(`[LeaseCreation] Unit ${unit.unitNumber} marked as occupied.`);
       }
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
    rentAmount: monthlyRent, // Alias for compatibility with internal logic
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

  // Calculate services to include in monthly rent
  const includedServices = lease.services 
    ? lease.services.filter(s => s.billingMethod === 'included_in_rental') 
    : [];
  
  const includedServicesTotal = includedServices.reduce((sum, s) => {
    return sum + (Number(s.amount) * (s.isTaxable ? (1 + taxRate/100) : 1));
  }, 0);

  // Distribute included services across payment intervals for Rent Invoices
  // Note: If paymentInterval > 1, we multiply the monthly intent of service? 
  // OR is the service amount considered "Annual"? 
  // Assumption: Service Amount provided is per-payment-term or total?
  // User said "Billing include... in pdc include that amount".
  // PDCs are generated per checque. 
  // If I have 12 cheques (monthly), and Service is 5000. 
  // Is 5000 added to EACH cheque? Or distributed?
  // Current Frontend Logic: `const servicesPerCheque = servicesTotal / numberOfCheques`.
  // So it is DISTRIBUTED.
  // Backend should match.
  // Wait, backend `generateLeaseInvoices` logic for Rent is: `paymentAmount = monthlyRent` (for monthly).
  // So `monthlyRent` is per month.
  // If `includedServicesTotal` is the TOTAL sum of services (e.g. 5000 AED One-time? Or 5000 AED Annual?)
  // Frontend `generatePDCSchedule` takes `s.amount` and sums it to `servicesTotal`.
  // Then divides by `numberOfCheques`.
  // So `s.amount` is interpreted as "Total Contract Value of Service".
  // So Backend should also treat it as Total Value and distribute.

  // NOTE: `generateLeaseInvoices` generates invoices based on Payment Frequency.
  // `numberOfInvoices` approx `duration / paymentInterval`.
  // We should calculate how much service amount to add per invoice.
  const totalLeaseMonths = lease.duration || 12; // fallback
  const monthlyServiceShare = includedServicesTotal / totalLeaseMonths; 

  // Initialize currentDate and invoiceNumber for the loop
  let currentDate = new Date(start);
  let invoiceNumber = 1;

  // Generate Invoices loop (Advance Payment - Start Date)
  while (currentDate < end) {
    const dueDate = new Date(currentDate); 
    // For advance payment, Due Date is the start of the period (currentDate)
    
    // Calculate period end
    const periodEnd = new Date(currentDate);
    periodEnd.setMonth(periodEnd.getMonth() + paymentInterval);

    // Don't exceed lease end date
    let currentPaymentAmount = paymentAmount; // Base rent for this period
    let currentServiceShare = monthlyServiceShare * paymentInterval;

    if (periodEnd > end) {
       // Proration handling if needed (mostly for last period)
       // If periodEnd goes beyond, we cap it.
       // Note: Standard logic often keeps full payment for last partial month or prorates.
       // Keeping existing simple calculation but adjusting for Advance date logic.
       // Start: Jan 1. End: Jan 1 next year.
       // Iteration 12: Dec 1. Period End: Jan 1. Matches.
    }

    const subtotal = parseFloat(currentPaymentAmount) + parseFloat(currentServiceShare);
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;

    const invoice = await Invoice.create({
      invoiceNumber: `${lease.leaseNumber}-${String(invoiceNumber).padStart(2, '0')}`,
      leaseId,
      tenantId,
      invoiceDate: dueDate, // Issue/Due date is Start of Period
      dueDate: dueDate, 
      subtotal,
      taxAmount,
      totalAmount,
      status: 'sent',
      type: 'rent',
      description: `Rent for period ${currentDate.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}` + 
                   (includedServices.length > 0 ? ` (Includes ${includedServices.length} services)` : ""),
      periodStart: currentDate,
      periodEnd: periodEnd
    }, { transaction });

    invoices.push(invoice);

    // Create Payment record for this invoice
    const payment = await Payment.create({
      paymentNumber: `${lease.leaseNumber}-PAY-${String(invoiceNumber).padStart(2, '0')}`,
      leaseId,
      invoiceId: invoice.id,
      amount: totalAmount,
      paymentDate: dueDate,
      dueDate: dueDate,
      status: 'pending',
      paymentMethod: 'cheque',
      type: 'rent'
    }, { transaction });
    
    // NOTE: Cheques for Rent are created in 'createLease' using pdcSchedule.
    // They are NOT linked to these payments yet because we don't know which cheque maps to which invoice/payment easily here 
    // (unless we assume order). 
    // However, Frontend 'InvoiceForm' does the matching by Date/Amount.
    // Since we fixed the Date to be Advance (Start Date), matching should now work!

    currentDate.setMonth(currentDate.getMonth() + paymentInterval); // Move to next period
    invoiceNumber++;
  }

  // Handle Separate Services (CDQ)
  const separateServices = lease.services 
    ? lease.services.filter(s => s.billingMethod === 'charged_separately') 
    : [];
  
  let layoutServiceIdx = 1;
  for (const service of separateServices) {
       const serviceAmount = Number(service.amount);
       const serviceTax = service.isTaxable ? (serviceAmount * taxRate / 100) : 0;
       const totalServiceAmount = serviceAmount + serviceTax;

       const serviceInvoice = await Invoice.create({
          invoiceNumber: `${lease.leaseNumber}-SRV-${String(layoutServiceIdx).padStart(2, '0')}`,
          leaseId,
          tenantId,
          invoiceDate: new Date(startDate), 
          dueDate: new Date(startDate),
          subtotal: serviceAmount,
          taxAmount: serviceTax,
          totalAmount: totalServiceAmount,
          status: 'sent',
          type: 'service_charge',
          description: `CDQ - ${service.name}`,
          periodStart: new Date(startDate),
          periodEnd: new Date(endDate)
       }, { transaction });

       invoices.push(serviceInvoice);
       
       const payment = await Payment.create({
        paymentNumber: `${lease.leaseNumber}-SRV-PAY-${String(layoutServiceIdx).padStart(2, '0')}`,
        leaseId,
        invoiceId: serviceInvoice.id,
        amount: totalServiceAmount,
        paymentDate: new Date(startDate),
        dueDate: new Date(startDate),
        status: 'pending',
        paymentMethod: 'cheque', 
        type: 'service_charge'
      }, { transaction });

      // Create Cheque for CDQ (since not in Rent PDC Schedule)
      // Usually CDQ is paid by cheque too? Or Cash?
      // User said "show the pdc as well as the seperate as cdq" -> implies Cheque/PDC list.
      await Cheque.create({
          chequeNumber: `CDQ-${String(layoutServiceIdx).padStart(2, '0')}`, // Placeholder
          bankName: 'Pending',
          amount: totalServiceAmount,
          chequeDate: new Date(startDate),
          status: 'pending',
          chequeType: 'current', // or pdc
          tenantId: lease.tenantId,
          leaseId: lease.id,
          paymentId: payment.id, // Link to payment!
          invoiceId: serviceInvoice.id, // Link to invoice!
          currency: 'AED',
          createdBy: 1, // Default user ID as we don't have req.user here easily without refactor. 
                        // To allow req.user.id, we'd need to change function signature AND caller.
                        // For now, 1 (Admin) is safe fallback.
          isActive: true
      }, { transaction });

       layoutServiceIdx++;
  }

  return invoices;
}

/**
 * Record expected revenue from lease in financial transactions
 */
async function recordExpectedRevenue(lease, transaction, userId = 1) {
  try {
    const unit = await Unit.findByPk(lease.unitId, { transaction });
    if (!unit) return;

    const monthlyRent = parseFloat(lease.rentAmount || lease.monthlyRent || 0);
    if (!monthlyRent || monthlyRent <= 0) return;

    const start = new Date(lease.startDate);
    const end = new Date(lease.endDate);
    const months = Math.max(
      1,
      Math.ceil((end - start) / (1000 * 60 * 60 * 24 * 30)),
    );
    const totalRevenue = monthlyRent * months;

    const revenueAccount =
      (await ChartOfAccount.findOne({
        where: {
          accountType: 'revenue',
          isActive: true,
          propertyId: unit.propertyId,
          [Op.or]: [
            { accountName: { [Op.like]: '%Rental%' } },
            { accountName: { [Op.like]: '%Rent%' } },
            { accountName: { [Op.like]: '%Income%' } },
          ],
        },
        order: [['id', 'ASC']],
        transaction,
      })) ||
      (await ChartOfAccount.findOne({
        where: {
          accountType: 'revenue',
          isActive: true,
          propertyId: null,
          [Op.or]: [
            { accountName: { [Op.like]: '%Rental%' } },
            { accountName: { [Op.like]: '%Rent%' } },
            { accountName: { [Op.like]: '%Income%' } },
          ],
        },
        order: [['id', 'ASC']],
        transaction,
      })) ||
      (await ChartOfAccount.findOne({
        where: {
          accountType: 'revenue',
          isActive: true,
          [Op.or]: [{ propertyId: unit.propertyId }, { propertyId: null }],
        },
        order: [['id', 'ASC']],
        transaction,
      }));

    if (!revenueAccount) {
      console.warn(
        `[LeaseRevenue] Skipping financial transaction for lease ${lease.leaseNumber}: no active revenue account found`,
      );
      return;
    }

    const transactionCount = await FinancialTransaction.count({ transaction });
    const transactionNumber = `TXN-${new Date().getFullYear()}-${String(
      transactionCount + 1,
    ).padStart(3, '0')}`;

    await FinancialTransaction.create(
      {
        transactionNumber,
        transactionDate: lease.startDate,
        transactionType: 'credit',
        amount: totalRevenue,
        description: `Expected revenue from lease ${lease.leaseNumber}`,
        reference: `LEASE-${lease.id}`,
        accountId: revenueAccount.id,
        category: 'rent',
        status: 'pending',
        createdBy: userId || 1,
        propertyId: unit.propertyId,
      },
      { transaction },
    );
  } catch (error) {
    console.error(
      `[LeaseRevenue] Failed to record expected revenue for lease ${lease?.leaseNumber || lease?.id}:`,
      error.message || error,
    );
  }
}

// Update lease
const updateLease = async (req, res, next) => {
  try {
    const { id } = req.params;
    let updateData = req.body.data ? JSON.parse(req.body.data) : req.body;

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      const uploadedDocs = req.files.map(file => `/uploads/leases/${file.filename}`);
      
      // Initialize documents array if it doesn't exist
      if (!updateData.documents) {
        updateData.documents = [];
      } else if (typeof updateData.documents === 'string') {
        try {
          updateData.documents = JSON.parse(updateData.documents);
        } catch (e) {
          updateData.documents = [];
        }
      }
       
      // Append new files to specific existing ones or just add them
      // Note: Frontend should send existing files in 'documents' list if it wants to keep them
      updateData.documents = [...updateData.documents, ...uploadedDocs];
    }

    // Fix: leaseType is now handled by the model directly
    if (updateData.property && updateData.property.type) {
      updateData.propertyType = updateData.property.type;
    }

    const lease = await Lease.findByPk(id);
    if (!lease) {
      return res.status(404).json({
        success: false,
        message: 'Lease not found'
      });
    }

    // [FIX] Explicitly handle isRentalTaxable to prevent data type issues
    if (updateData.isRentalTaxable !== undefined) {
       console.log(`[LeaseController:Update] Received isRentalTaxable: ${updateData.isRentalTaxable} (Type: ${typeof updateData.isRentalTaxable})`);
       updateData.isRentalTaxable = updateData.isRentalTaxable === true || updateData.isRentalTaxable === 'true';
    }

    // [FIX] Detect status change for Unit Sync
    // If Admin manually changes status (e.g. from Active -> Draft), we must release the unit
    const previousStatus = lease.status;
    const newStatus = updateData.status;

    await lease.update(updateData);
    
    // Check if Status Changed
    if (newStatus && newStatus !== previousStatus && lease.unitId) {
        const unit = await Unit.findByPk(lease.unitId, { transaction: null }); // separate transaction if needed, but here simple await is fine
        if (unit) {
           const lowerNew = newStatus.toLowerCase();
           const lowerOld = previousStatus.toLowerCase();
           
           // Case 1: Active -> Non-Active (Draft, Terminated, etc)
           // We should set unit to Available
           if ((lowerOld === 'active' || lowerOld === 'renewed') && (lowerNew !== 'active' && lowerNew !== 'renewed')) {
               await unit.update({ status: 'available' });
               console.log(`[LeaseUpdate] Status changed to ${newStatus}. Unit ${unit.unitNumber} marked as available.`);
           }
           // Case 2: Non-Active -> Active
           // We should set unit to Occupied
           else if ((lowerOld !== 'active' && lowerOld !== 'renewed') && (lowerNew === 'active' || lowerNew === 'renewed')) {
               await unit.update({ status: 'occupied' });
               console.log(`[LeaseUpdate] Status changed to ${newStatus}. Unit ${unit.unitNumber} marked as occupied.`);
           }
        }
    }

    // [FIX] Update Services
    // Strategy: Delete all existing services and recreate from payload to ensure full sync (edits/adds/deletes)
    if (updateData.services) {
        let servicesData = updateData.services;
        console.log('[LeaseController:Update] Received services payload:', JSON.stringify(servicesData, null, 2));

        if (typeof servicesData === 'string') {
            try { servicesData = JSON.parse(servicesData); } catch(e) { servicesData = [] }
        }

        if (Array.isArray(servicesData)) {
            // Delete existing
            await Service.destroy({
                where: {
                    entityType: 'lease',
                    entityId: lease.id
                }
            });

            // Create new
            const newServices = servicesData.map((s, index) => ({
                name: s.name,
                amount: parseFloat(s.amount || 0),
                isTaxable: s.isTaxable === true || s.isTaxable === 'true',
                billingMethod: s.billingMethod || 'charged_separately',
                entityType: 'lease',
                entityId: lease.id,
                description: s.description || '',
                sortOrder: index,
                isActive: true
            }));

            if (newServices.length > 0) {
                await Service.bulkCreate(newServices);
                console.log(`[LeaseUpdate] Updated ${newServices.length} services for lease ${lease.leaseNumber}`);
            }
        }
    }

    // [FIX] Update/Sync PDC Schedule
    let pdcSchedule = updateData.pdcSchedule;
    if (typeof pdcSchedule === 'string') {
      try {
        pdcSchedule = JSON.parse(pdcSchedule);
      } catch (e) {
        console.error("Failed to parse pdcSchedule in updateLease:", e);
        pdcSchedule = [];
      }
    }

    if (pdcSchedule && Array.isArray(pdcSchedule)) {
      const userId = req.user?.id || 1; // Fallback to ID 1 if no user context
      
      // We need to handle this carefully to avoiding duplicating or overwriting incorrectly
      for (const pdc of pdcSchedule) {
        // Validation: Provide defaults if critical fields are missing to ensure saving
        const chequeNo = pdc.chequeNumber || 'Pending';
        const bank = pdc.bankName || 'Pending';

        const pdcPayload = {
          chequeNumber: chequeNo,
          bankName: bank,
          amount: parseFloat(pdc.amount || 0),
          chequeDate: pdc.dueDate || pdc.date || pdc.chequeDate || new Date(), // Prioritize dueDate
          chequeType: 'pdc',
          status: pdc.status || 'pending',
          tenantId: lease.tenantId,
          leaseId: lease.id,
          currency: 'AED',
          createdBy: userId, // Required field
          isActive: true
        };

        // Strategy: Upsert based on ID or (LeaseID + ChequeNumber) to prevent duplicates
        let existingCheque = null;

        // 1. Try finding by ID
        if (pdc.id) {
           existingCheque = await Cheque.findByPk(pdc.id);
        }

        // 2. If not found by ID (or ID not provided), try finding by Cheque Number for this lease
        // This is crucial to prevent duplicates if frontend sends 'new' data that is actually existing
        if (!existingCheque && chequeNo !== 'Pending') {
           existingCheque = await Cheque.findOne({
             where: {
               leaseId: lease.id,
               chequeNumber: chequeNo
             }
           });
        }

        if (existingCheque) {
          // Prevent overwriting status if it's already advanced (e.g. deposited/cleared) unless strictly intended
          // keeping it simple for now as per user request to just fix duplicates
          await existingCheque.update(pdcPayload);
        } else {
          await Cheque.create(pdcPayload);
        }
      }
      console.log(`[LeaseUpdate] Processed PDC schedule updates for lease ${lease.leaseNumber}`);
    }

    // Update Unit details if property info is provided
    console.log('DEBUG: (Update) Checking Unit Update. UnitID:', lease.unitId, 'Property Data:', JSON.stringify(updateData.property));

    if (lease.unitId && updateData.property) {
      const unit = await Unit.findByPk(lease.unitId);
      if (unit) {
        const updates = {};
        // Only update fields that are present and not null/undefined
        if (updateData.property.area) updates.area = updateData.property.area;
        // Check for undefined specifically since 0 is a valid value for bedrooms/bathrooms
        if (updateData.property.bedrooms !== undefined) updates.bedrooms = updateData.property.bedrooms;
        if (updateData.property.bathrooms !== undefined) updates.bathrooms = updateData.property.bathrooms;
        // Parking is boolean in Unit model but number in form
        if (updateData.property.parking !== undefined) updates.parking = updateData.property.parking;
        
        console.log('DEBUG: (Update) Proposed Unit Updates:', JSON.stringify(updates));

        if (Object.keys(updates).length > 0) {
          await unit.update(updates);
           console.log('DEBUG: (Update) Unit updated successfully');
        }
      } else {
           console.log('DEBUG: (Update) Unit not found');
      }
    }

    res.json({
      success: true,
      message: 'Lease updated successfully',
      data: lease
    });
  } catch (error) {
    next(error);
  }
};

// Terminate lease
const terminateLease = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lease = await Lease.findByPk(id);

    if (!lease) {
      return res.status(404).json({
        success: false,
        message: 'Lease not found'
      });
    }

    await lease.update({
      status: 'terminated',
      isActive: false,
      terminationDate: new Date()
    });

    // [New Logic]: Mark unit as available when lease is terminated
    if (lease.unitId) {
      const unit = await Unit.findByPk(lease.unitId);
      if (unit) {
        await unit.update({ status: 'available' });
        console.log(`[LeaseTermination] Unit ${unit.unitNumber} marked as available.`);
      }
    }

    res.json({
      success: true,
      message: 'Lease terminated successfully',
      data: lease
    });
  } catch (error) {
    next(error);
  }
};

// Approve lease
const approveLease = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lease = await Lease.findByPk(id);

    if (!lease) {
      return res.status(404).json({
        success: false,
        message: 'Lease not found'
      });
    }
    
    // [Validation] Check if unit already has an active lease
    if (lease.unitId) {
        const existingActiveLease = await Lease.findOne({
            where: {
                unitId: lease.unitId,
                status: { [Op.in]: ['active', 'renewed'] },
                id: { [Op.ne]: lease.id } // Exclude self if somehow re-approving
            }
        });
        
        if (existingActiveLease) {
             return res.status(400).json({
                 success: false,
                 message: `Cannot approve. Unit is already occupied by active lease ${existingActiveLease.leaseNumber}`
             });
        }
    }

    await lease.update({
      status: 'active',
      isActive: true, // Ensure it's active
      approvalDate: new Date() // Optional: track approval date if schema allows, otherwise just status
    });

    // [New Logic]: Mark unit as occupied when lease is approved
    if (lease.unitId) {
      const unit = await Unit.findByPk(lease.unitId);
      if (unit) {
        await unit.update({ status: 'occupied' });
        console.log(`[LeaseApproval] Unit ${unit.unitNumber} marked as occupied.`);
      }
    }

    res.json({
      success: true,
      message: 'Lease approved successfully',
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

    // [New Logic]: If lease was active/occupied, release the unit
    if (lease.unitId && (lease.status === 'active' || lease.status === 'renewed')) {
       // Check if there are other active leases for this unit (unlikely but safe)
       const otherActiveLease = await Lease.findOne({
          where: {
             unitId: lease.unitId,
             id: { [Op.ne]: lease.id },
             status: 'active'
          }
       });

       if (!otherActiveLease) {
          const unit = await Unit.findByPk(lease.unitId);
          if (unit) {
             await unit.update({ status: 'available' });
             console.log(`[LeaseDeletion] Unit ${unit.unitNumber} marked as available.`);
          }
       }
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

    /** Sum of monthly rent (rent_amount) for all active leases — KPI "Monthly Revenue" */
    const monthlyRevenueSum = await Lease.sum('rentAmount', {
      where: { status: 'active' }
    });
    const monthlyRevenue = monthlyRevenueSum != null ? parseFloat(String(monthlyRevenueSum)) : 0;

    res.json({
      success: true,
      data: {
        total: totalLeases,
        active: activeLeases,
        expired: expiredLeases,
        draft: draftLeases,
        monthlyRevenue
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get expiring leases
const getExpiringLeases = async (req, res, next) => {
  try {
    const { days = 120 } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));
    futureDate.setHours(23, 59, 59, 999);

    const expiringLeases = await Lease.findAll({
      where: {
        status: 'active',
        endDate: {
          [Op.between]: [today, futureDate]
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
      data: expiringLeases.map((lease) => {
        const endDate = new Date(lease.endDate);
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysToExpiry = Math.ceil((endDate.getTime() - today.getTime()) / msPerDay);
        return {
          ...lease.toJSON(),
          daysToExpiry,
          noticeSent: !!lease.rentIncreaseNoticeSentAt
        };
      })
    });
  } catch (error) {
    next(error);
  }
};

const previewRenewalNotice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { proposedRent } = req.query;

    const lease = await Lease.findByPk(id, {
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Unit,
          as: 'unit',
          attributes: ['id', 'unitNumber', 'propertyId'],
          include: [{ model: Property, as: 'property', attributes: ['id', 'title', 'location'] }]
        }
      ]
    });

    if (!lease) {
      return res.status(404).json({ success: false, message: 'Lease not found' });
    }

    const template = buildLeaseRenewalNoticeTemplate(lease, { proposedRent });

    res.json({
      success: true,
      data: {
        lease: lease.toJSON(),
        subject: template.subject,
        html: template.html,
        text: template.text,
        currentRent: Number(lease.rentAmount || 0),
        proposedRent: proposedRent != null && proposedRent !== '' ? Number(proposedRent) : null
      }
    });
  } catch (error) {
    next(error);
  }
};

const sendRenewalNotice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { subject, html, text, proposedRent } = req.body;

    const lease = await Lease.findByPk(id, {
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: Unit,
          as: 'unit',
          attributes: ['id', 'unitNumber', 'propertyId'],
          include: [{ model: Property, as: 'property', attributes: ['id', 'title', 'location'] }]
        }
      ]
    });

    if (!lease) {
      return res.status(404).json({ success: false, message: 'Lease not found' });
    }

    if (!lease.tenant?.email) {
      return res.status(400).json({ success: false, message: 'Selected tenant does not have an email address.' });
    }

    const transport = createMailTransport();
    if (!transport) {
      return res.status(400).json({ success: false, message: 'SMTP is not configured. Please check email settings.' });
    }

    const template = buildLeaseRenewalNoticeTemplate(lease, {
      subject,
      html,
      text,
      proposedRent
    });

    const fromAddr =
      process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';

    await transport.sendMail({
      from: fromAddr,
      to: lease.tenant.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    await lease.update({ rentIncreaseNoticeSentAt: new Date() });

    res.json({
      success: true,
      message: `Renewal notice sent to ${lease.tenant.email}`,
      data: {
        leaseId: lease.id,
        leaseNumber: lease.leaseNumber,
        sentTo: lease.tenant.email,
        sentAt: lease.rentIncreaseNoticeSentAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk import leases from Excel (template columns documented in API response).
 */
const importLeases = async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    if (!jsonData.length) {
      return res.status(400).json({ success: false, message: 'Excel file is empty' });
    }

    const results = { success: 0, failed: 0, errors: [] };

    // Pre-cache all properties, tenants, and units for O(1) lookups
    const allProperties = await Property.findAll({ attributes: ['id', 'title'] });
    const propertyByLower = new Map();
    for (const p of allProperties) {
      propertyByLower.set(String(p.title || '').toLowerCase().trim(), p);
    }

    const allTenants = await Tenant.findAll({ attributes: ['id', 'email'] });
    const tenantByEmail = new Map();
    for (const t of allTenants) {
      if (t.email) tenantByEmail.set(String(t.email).toLowerCase().trim(), t);
    }

    const allUnits = await Unit.findAll({ attributes: ['id', 'unitNumber', 'propertyId', 'status'] });
    const unitByPropAndNum = new Map();
    for (const u of allUnits) {
      const key = `${u.propertyId}_${String(u.unitNumber || '').toLowerCase().trim()}`;
      unitByPropAndNum.set(key, u);
    }

    const normFreq = (v) => {
      const s = String(v || 'monthly').toLowerCase().replace(/\s+/g, '');
      if (s === 'quarterly') return 'quarterly';
      if (s === 'semi-annually' || s === 'semiannually') return 'semi-annually';
      if (s === 'annually' || s === 'annual' || s === 'yearly') return 'annually';
      return 'monthly';
    };

    const parseDate = (v) => {
      if (v == null || v === '') return null;
      if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().split('T')[0];
      if (typeof v === 'number' && v > 10000 && v < 100000) {
        const epoch = new Date(Math.round((v - 25569) * 86400000));
        if (!isNaN(epoch.getTime())) return epoch.toISOString().split('T')[0];
      }
      const str = String(v).trim();
      const iso = str.match(/^(\d{4}-\d{2}-\d{2})/);
      if (iso) return iso[1];
      const slashMatch = str.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
      if (slashMatch) return `${slashMatch[1]}-${slashMatch[2]}-${slashMatch[3]}`;
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    };

    const getVal = (row, ...keys) => {
      for (const k of keys) {
        if (row[k] !== undefined) return row[k];
        const stripped = k.replace(/^\uFEFF/, '');
        if (stripped !== k && row[stripped] !== undefined) return row[stripped];
        const bomKey = '\uFEFF' + k;
        if (row[bomKey] !== undefined) return row[bomKey];
      }
      return undefined;
    };

    for (const [index, row] of jsonData.entries()) {
      const rowNum = index + 2;
      const errs = [];
      const tenantIdRaw = getVal(row, 'Tenant ID', 'tenant_id');
      const tenantEmail = getVal(row, 'Tenant Email', 'tenant_email');
      const unitIdRaw = getVal(row, 'Unit ID', 'unit_id');
      const propertyName = getVal(row, 'Property Name', 'property_name');
      const unitNumber = getVal(row, 'Unit Number', 'unit_number');
      const startDate = parseDate(getVal(row, 'Start Date', 'start_date'));
      const endDate = parseDate(getVal(row, 'End Date', 'end_date'));
      const cleanNum = (v) => parseFloat(String(v == null ? '0' : v).replace(/,/g, ''));
      const monthlyRent = cleanNum(getVal(row, 'Monthly Rent (AED)', 'Monthly Rent', 'monthly_rent') ?? 0);
      const deposit = cleanNum(getVal(row, 'Security Deposit (AED)', 'Security Deposit', 'deposit') ?? 0);
      const statusRaw = String(getVal(row, 'Status', 'status') ?? 'draft').toLowerCase();
      const mappedStatus = statusRaw === 'approved' ? 'active' : statusRaw;
      const status = ['active', 'draft', 'expired', 'terminated', 'renewed'].includes(mappedStatus) ? mappedStatus : 'draft';
      const paymentFrequency = normFreq(getVal(row, 'Payment Frequency', 'payment_frequency'));
      const leaseNumberOverride = getVal(row, 'Lease Number', 'lease_number');
      const notes = getVal(row, 'Notes / Observations', 'Notes', 'notes') ?? '';

      if (!startDate) errs.push('Start Date is required (YYYY-MM-DD)');
      if (!endDate) errs.push('End Date is required (YYYY-MM-DD)');
      if (!monthlyRent || monthlyRent <= 0) errs.push('Monthly Rent must be > 0');

      let tenantId = tenantIdRaw != null && tenantIdRaw !== '' && !isNaN(parseInt(tenantIdRaw, 10))
        ? parseInt(tenantIdRaw, 10) : null;

      let emailToLookup = tenantEmail ? String(tenantEmail).split('/')[0].trim() : null;
      if (emailToLookup) emailToLookup = emailToLookup.replace(/^email:\s*/i, '').replace(/\.+$/, '').trim();
      if (emailToLookup && (emailToLookup.includes('@nomail.com') || emailToLookup === '#N/A' || !emailToLookup.includes('@'))) {
        emailToLookup = null;
      }

      if (!tenantId && emailToLookup) {
        const t = tenantByEmail.get(emailToLookup.toLowerCase());
        if (t) tenantId = t.id;
        else errs.push(`Tenant not found for email: ${emailToLookup}`);
      } else if (!tenantId) {
        errs.push('Tenant ID or Tenant Email is required');
      }

      let unitId = unitIdRaw != null && unitIdRaw !== '' ? parseInt(unitIdRaw, 10) : null;
      if (!unitId && propertyName && unitNumber) {
        const propNameLower = String(propertyName).trim().toLowerCase();
        // In-memory property lookup: try exact match first, then substring
        let propRow = propertyByLower.get(propNameLower);
        if (!propRow) {
          for (const [key, val] of propertyByLower) {
            if (key.includes(propNameLower) || propNameLower.includes(key)) {
              propRow = val;
              break;
            }
          }
        }
        const unitNumKey = propRow
          ? `${propRow.id}_${String(unitNumber).trim().toLowerCase()}`
          : null;
        const unit = unitNumKey ? unitByPropAndNum.get(unitNumKey) : null;
        if (unit) unitId = unit.id;
        else errs.push(`Unit not found: ${propertyName} / ${unitNumber}`);
      } else if (!unitId) {
        errs.push('Unit ID or (Property Name + Unit Number) is required');
      }

      if (errs.length) {
        results.failed++;
        results.errors.push({ row: rowNum, messages: errs });
        continue;
      }

      // Pre-check unit occupancy against real active leases
      if (status === 'active' && unitId) {
        const cachedUnit = allUnits.find(u => u.id === unitId);
        const blockingLease = await findBlockingActiveLeaseForUnit(unitId, null);
        if (blockingLease) {
          results.failed++;
          results.errors.push({ row: rowNum, messages: ['Unit is occupied; cannot create active lease'] });
          continue;
        }
        if (cachedUnit && String(cachedUnit.status || '').toLowerCase() === 'occupied') {
          cachedUnit.status = 'available';
        }
      }

      const transaction = await sequelize.transaction();
      try {

        let leaseNumber = leaseNumberOverride ? String(leaseNumberOverride).trim() : null;
        if (leaseNumber) {
          const exists = await Lease.findOne({ where: { leaseNumber }, transaction });
          if (exists) {
            await transaction.rollback();
            results.failed++;
            results.errors.push({ row: rowNum, messages: [`Lease Number ${leaseNumber} already exists`] });
            continue;
          }
        } else {
          leaseNumber = await resolveLeaseNumber(null, unitId, transaction);
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        let duration = 12;
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
          const months =
            (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
          duration = Math.max(1, months);
        }

        const lease = await Lease.create(
          {
            leaseNumber,
            leaseType: String(getVal(row, 'Lease Type', 'lease_type') ?? 'residential').toLowerCase().includes('commercial') ? 'commercial' : 'residential',
            tenantId,
            unitId,
            startDate,
            endDate,
            duration,
            rentAmount: monthlyRent,
            depositAmount: deposit,
            paymentFrequency,
            paymentDay: parseInt(getVal(row, 'Payment Day', 'payment_day') ?? 1, 10) || 1,
            status,
            terms: notes || null,
            renewalTerms: getVal(row, 'Renewal Terms', 'renewal_terms') ?? null,
            isActive: status === 'active',
            gracePeriod: parseInt(getVal(row, 'Grace Period Days') ?? 0, 10) || 0,
            lateFee: parseFloat(getVal(row, 'Late Fee (AED)') ?? 0) || 0,
            terminationNotice: parseInt(getVal(row, 'Termination Notice (Days)') ?? 60, 10) || 60,
            totalDeposits: deposit,
          },
          { transaction },
        );

        if (status === 'active' && unitId) {
          await Unit.update({ status: 'occupied' }, { where: { id: unitId }, transaction });
          // Update the in-memory cache so subsequent rows see this unit as occupied
          const cachedUnit = allUnits.find(u => u.id === unitId);
          if (cachedUnit) cachedUnit.status = 'occupied';
          const leaseForInv = lease.toJSON();
          if (leaseForInv.paymentFrequency === 'semi-annually') {
            leaseForInv.paymentFrequency = 'semi_annual';
          }
          await generateLeaseInvoices(leaseForInv, transaction);
          await recordExpectedRevenue(lease, transaction, req.user?.id || 1);
        }

        await transaction.commit();
        results.success++;
      } catch (e) {
        try { await transaction.rollback(); } catch (_) {}
        results.failed++;
        results.errors.push({ row: rowNum, messages: [e.message || String(e)] });
      }
    }

    res.json({
      success: true,
      message: `Import completed. Success: ${results.success}, Failed: ${results.failed}`,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

const broadcastAnnouncement = async (req, res, next) => {
  try {
    const {
      propertyId,
      subject,
      html,
      minDaysEndDate = 60,
      strictRenewalFilter = false,
      minInitialTermDays = 90,
      sendEmails = false,
      maxSend = 50
    } = req.body;
    if (!propertyId || !subject || !html) {
      return res.status(400).json({
        success: false,
        message: 'propertyId, subject, and html are required'
      });
    }
    const pid = parseInt(propertyId, 10);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minEnd = new Date(today);
    minEnd.setDate(minEnd.getDate() + parseInt(minDaysEndDate, 10));
    const minTerm = parseInt(minInitialTermDays, 10) || 90;
    const cap = Math.min(Math.max(parseInt(maxSend, 10) || 50, 1), 200);

    /*
     * Active leases on the property whose end date is at least minDaysEndDate ahead.
     * Optional strictRenewalFilter: drop likely holdover-without-renewal unless autoRenewal,
     * renewalTerms text, or original term length >= minInitialTermDays.
     */
    const leases = await Lease.findAll({
      where: {
        status: 'active',
        endDate: { [Op.gte]: minEnd }
      },
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'email'],
          required: true,
          where: { email: { [Op.ne]: null } }
        },
        {
          model: Unit,
          as: 'unit',
          required: true,
          include: [
            {
              model: Property,
              as: 'property',
              required: true,
              where: { id: pid }
            }
          ]
        }
      ]
    });

    let filtered = leases;
    if (strictRenewalFilter) {
      filtered = leases.filter((l) => {
        if (l.autoRenewal) return true;
        if (l.renewalTerms && String(l.renewalTerms).trim()) return true;
        const sd = new Date(l.startDate);
        const ed = new Date(l.endDate);
        const days = Math.round((ed.getTime() - sd.getTime()) / 86400000);
        return days >= minTerm;
      });
    }

    const emails = [...new Set(filtered.map((l) => l.tenant.email).filter(Boolean))];
    console.log(`[BuildingAnnouncement] property=${pid} recipients=${emails.length} subject=${subject}`);

    let emailsSent = 0;
    let emailsSkipped = 0;
    const sendErrors = [];

    if (sendEmails && emails.length > 0) {
      const transport = createMailTransport();
      const fromAddr =
        process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';
      if (!transport) {
        emailsSkipped = emails.length;
        sendErrors.push('SMTP not configured (SMTP_USER / SMTP_PASSWORD)');
      } else {
        const slice = emails.slice(0, cap);
        emailsSkipped = emails.length - slice.length;
        for (let i = 0; i < slice.length; i++) {
          try {
            await transport.sendMail({
              from: fromAddr,
              to: slice[i],
              subject,
              html,
              text: html.replace(/<[^>]+>/g, ' ')
            });
            emailsSent++;
          } catch (mailErr) {
            sendErrors.push(`${slice[i]}: ${mailErr.message}`);
          }
          await new Promise((r) => setTimeout(r, 120));
        }
      }
    }

    res.json({
      success: true,
      message: sendEmails
        ? `Sent ${emailsSent} email(s); ${emailsSkipped} not sent (cap or skipped).`
        : `Prepared announcement for ${emails.length} recipient(s).`,
      data: {
        count: emails.length,
        sample: emails.slice(0, 10),
        bodyPreview: html,
        strictRenewalFilter: !!strictRenewalFilter,
        emailsSent,
        emailsSkipped,
        sendErrors: sendErrors.slice(0, 5)
      }
    });
  } catch (e) {
    next(e);
  }
};

/**
 * Bulk-create leases from pre-resolved JSON (used by the import wizard).
 * Expects { leases: [{ tenantId, unitId, startDate, endDate, rentAmount, ... }] }
 */
const bulkCreateLeases = async (req, res, next) => {
  try {
    const { leases } = req.body;
    if (!Array.isArray(leases) || !leases.length) {
      return res.status(400).json({ success: false, message: 'No lease data provided' });
    }

    const results = { success: 0, failed: 0, errors: [] };

    for (const [index, row] of leases.entries()) {
      const errs = [];
      const {
        tenantId, unitId, startDate, endDate,
        rentAmount, depositAmount, paymentFrequency: pf,
        paymentDay, status: rawStatus, leaseNumber: leaseNumberOverride,
        leaseType: rawLeaseType, terms, renewalTerms,
        gracePeriod, lateFee, terminationNotice,
      } = row;

      if (!tenantId) errs.push('Tenant ID is required');
      if (!unitId) errs.push('Unit ID is required');
      if (!startDate) errs.push('Start Date is required');
      if (!endDate) errs.push('End Date is required');
      if (!rentAmount || parseFloat(rentAmount) <= 0) errs.push('Monthly Rent must be > 0');

      const status = ['active', 'draft', 'expired', 'terminated', 'renewed'].includes(rawStatus) ? rawStatus : 'draft';
      const paymentFrequency = ['monthly', 'quarterly', 'semi-annually', 'annually'].includes(pf) ? pf : 'monthly';
      const leaseType = String(rawLeaseType || '').toLowerCase().includes('commercial') ? 'commercial' : 'residential';

      if (errs.length) {
        results.failed++;
        results.errors.push({ index, messages: errs });
        continue;
      }

      const transaction = await sequelize.transaction();
      try {
        if (status === 'active') {
          const unit = await Unit.findByPk(unitId, { transaction });
          const blockingLease = await findBlockingActiveLeaseForUnit(unitId, transaction);
          if (blockingLease) {
            await transaction.rollback();
            results.failed++;
            results.errors.push({ index, messages: ['Unit is already occupied; cannot create active lease'] });
            continue;
          }
          await clearStaleOccupiedStatus(unit, transaction);
        }

        let leaseNumber = leaseNumberOverride ? String(leaseNumberOverride).trim() : null;
        if (leaseNumber) {
          const exists = await Lease.findOne({ where: { leaseNumber }, transaction });
          if (exists) {
            await transaction.rollback();
            results.failed++;
            results.errors.push({ index, messages: [`Lease Number ${leaseNumber} already exists`] });
            continue;
          }
        } else {
          leaseNumber = await resolveLeaseNumber(null, unitId, transaction);
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        let duration = 12;
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
          const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
          duration = Math.max(1, months);
        }

        const lease = await Lease.create({
          leaseNumber,
          leaseType,
          tenantId,
          unitId,
          startDate,
          endDate,
          duration,
          rentAmount: parseFloat(rentAmount),
          depositAmount: parseFloat(depositAmount || 0),
          paymentFrequency,
          paymentDay: parseInt(paymentDay) || 1,
          status,
          terms: terms || null,
          renewalTerms: renewalTerms || null,
          isActive: status === 'active',
          gracePeriod: parseInt(gracePeriod) || 0,
          lateFee: parseFloat(lateFee) || 0,
          terminationNotice: parseInt(terminationNotice) || 60,
          totalDeposits: parseFloat(depositAmount || 0),
        }, { transaction });

        if (status === 'active' && unitId) {
          await Unit.update({ status: 'occupied' }, { where: { id: unitId }, transaction });
          const leaseForInv = lease.toJSON();
          if (leaseForInv.paymentFrequency === 'semi-annually') {
            leaseForInv.paymentFrequency = 'semi_annual';
          }
          await generateLeaseInvoices(leaseForInv, transaction);
          await recordExpectedRevenue(lease, transaction, req.user?.id || 1);
        }

        await transaction.commit();
        results.success++;
      } catch (e) {
        try { await transaction.rollback(); } catch (_) {}
        results.failed++;
        results.errors.push({ index, messages: [e.message || String(e)] });
      }
    }

    res.json({
      success: true,
      message: `Import completed. Success: ${results.success}, Failed: ${results.failed}`,
      data: results,
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
  getExpiringLeases,
  terminateLease,
  approveLease,
  getAnalytics,
  importLeases,
  broadcastAnnouncement,
  bulkCreateLeases,
  previewRenewalNotice,
  sendRenewalNotice,
};
