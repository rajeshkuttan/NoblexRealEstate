const {
  Property,
  Lead,
  LeadProperty,
  User,
  sequelize,
  Lease,
  Unit,
  FinancialTransaction,
  Cheque,
  Ticket,
  VendorInvoice,
  PurchaseInvoice,
  DirectPurchaseInvoiceLine,
} = require('../models');
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');
const {
  persistImagesArray,
  removeOrphanedUploads,
  deleteEntityUploadDir
} = require('../utils/saveEntityImages');
const { companyWhere, withCompanyId, assertRecordInCompany } = require('../utils/companyScope');

/**
 * Sanitizes date fields in the request body to prevent "Invalid date" errors
 */
const sanitizeDates = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const sanitized = { ...data };
  const dateFields = ['lastInspection', 'nextInspection', 'insuranceExpiry', 'moveInDate'];
  
  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key];
    if (value !== null && value !== undefined) {
      const stringValue = String(value).toLowerCase();
      // Convert "Invalid date" or any variant to null
      if (stringValue.includes('invalid') && stringValue.includes('date')) {
        sanitized[key] = null;
      } 
      // Convert empty strings to null for date fields
      else if (stringValue === '' && dateFields.includes(key)) {
        sanitized[key] = null;
      }
    }
  });
  
  return sanitized;
};

// Get all properties with filters and pagination
const getProperties = async (req, res, next) => {
  try {
    const {
      search = '',
      emirate = '',
      buildingType = '',
      availability = '',
      minPrice = '',
      maxPrice = '',
      sortBy = 'created_at',
      sortOrder = 'desc',
      // New frontend params
      type = '', // Residential, Commercial, etc.
      category = '', // Apartment, Villa, etc.
      status = '' // Active, Maintenance, etc.
    } = req.query;

    // Normalize pagination with max limit enforcement
    const { page, limit, offset } = normalizePagination(req.query, 10, 500);
    const whereClause = { ...companyWhere(req) };

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
        { community: { [Op.like]: `%${search}%` } }
      ];
    }

    // Type filter
    if (type && type !== 'All') {
      whereClause.type = type;
    }

    // Category filter
    if (category && category !== 'All') {
        whereClause.category = category;
    }

    // Status mapping
    if (status && status !== 'All') {
        // Map frontend status to backend availability enum
        const s = status.toLowerCase();
        if (s === 'active') {
            whereClause.availability = { [Op.in]: ['available', 'rented'] };
        } else if (s === 'under-maintenance' || s === 'maintenance') {
            whereClause.availability = 'maintenance';
        } else if (s === 'vacant') {
            whereClause.availability = 'available';
        } else {
             // specific enum match
            whereClause.availability = s;
        }
    }

    // Legacy filters (keep for compatibility)
    if (emirate) whereClause.emirate = emirate;
    if (buildingType) whereClause.buildingType = buildingType;
    if (availability) whereClause.availability = availability;

    // Price range filter
    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) whereClause.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) whereClause.price[Op.lte] = parseFloat(maxPrice);
    }

    // Sort Mapping
    let order = [['created_at', 'DESC']]; // Default
    if (sortBy) {
        switch(sortBy) {
            case 'Revenue':
                order = [['monthlyRevenue', sortOrder.toUpperCase()]];
                break;
            case 'Occupancy':
                // Sorting by literal alias
                order = [[sequelize.literal('occupiedUnits'), sortOrder.toUpperCase()]];
                break;
            case 'Year Built':
                order = [['yearBuilt', sortOrder.toUpperCase()]];
                break;
            case 'Market Value':
                order = [['marketValue', sortOrder.toUpperCase()]];
                break;
            case 'Name':
                order = [['title', sortOrder.toUpperCase()]];
                break;
            default:
                // If passing raw column name
                if (sortBy !== 'created_at') {
                     // Basic sanitization or trust sequelize to throw if invalid
                     // Ideally check against allowed columns
                     order = [[sortBy, sortOrder.toUpperCase()]];
                }
        }
    }

    // Check if we should include units
    const includes = [
      {
        model: User,
        as: 'agent',
        attributes: ['id', 'name', 'email', 'phone']
      }
    ];

    if (req.query.includeUnits === 'true') {
      includes.push({
        model: Unit,
        as: 'units', // Assuming association is 'units'
        // Include ALL attributes or specific ones. 
        // Important: Include 'parking' which was missing!
        attributes: [
            'id', 'unitNumber', 'type', 'status', 'area', 'bedrooms', 
            'bathrooms', 'parking', 'floor', 'rentAmount', 'propertyId'
        ], 
        required: false
      });
    }

    const { count, rows: properties } = await Property.findAndCountAll({
      where: whereClause,
      attributes: {
        include: [
          [
            sequelize.literal('(SELECT COUNT(*) FROM units WHERE units.property_id = Property.id)'),
            'actualTotalUnits'
          ],
          [
            sequelize.literal("(SELECT COUNT(*) FROM units WHERE units.property_id = Property.id AND units.status = 'occupied')"),
            'occupiedUnits'
          ],
          [
            sequelize.literal("(SELECT COUNT(*) FROM units WHERE units.property_id = Property.id AND units.status = 'available')"),
            'vacantUnits'
          ]
        ],
        exclude: req.query.includeImages === 'true' ? [] : ['images'] // Exclude image paths from list queries unless requested (paths are small; keeps list payloads minimal)
      },
      include: includes,
      order: order,
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true // Important for correct count with includes
    });

    res.json({
      success: true,
      data: {
        properties,
        pagination: createPaginationMeta(count, page, limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single property by ID
const getProperty = async (req, res, next) => {
  try {
    const { id } = req.params;

    const property = await assertRecordInCompany(Property, id, req, {
      attributes: {
        include: [
          [
            sequelize.literal('(SELECT COUNT(*) FROM units WHERE units.property_id = Property.id)'),
            'actualTotalUnits'
          ],
          [
            sequelize.literal("(SELECT COUNT(*) FROM units WHERE units.property_id = Property.id AND units.status = 'occupied')"),
            'occupiedUnits'
          ],
          [
            sequelize.literal("(SELECT COUNT(*) FROM units WHERE units.property_id = Property.id AND units.status = 'available')"),
            'vacantUnits'
          ]
        ]
      },
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    res.json({
      success: true,
      data: { property }
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    next(error);
  }
};

// Create new property
const createProperty = async (req, res, next) => {
  try {
    const sanitizedData = sanitizeDates(req.body);
    const { images, ...rest } = sanitizedData;
    const propertyData = { ...rest };
    
    // Map salesmanId from frontend to agentId for backend model
    if (propertyData.salesmanId && !propertyData.agentId) {
      propertyData.agentId = propertyData.salesmanId;
    }
    
    propertyData.agentId = propertyData.agentId || req.user.id;

    const property = await Property.create(withCompanyId(req, { ...propertyData, images: null }));

    if (images !== undefined && images !== null) {
      const persisted = await persistImagesArray(
        Array.isArray(images) ? images : [],
        'property',
        property.id
      );
      if (persisted) {
        await property.update({ images: persisted });
      }
    }

    const createdProperty = await Property.findByPk(property.id, {
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: { property: createdProperty }
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    next(error);
  }
};

// Update property
const updateProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sanitizedData = sanitizeDates(req.body);
    const { images, ...updateData } = sanitizedData;

    // Map salesmanId from frontend to agentId for backend model
    if (updateData.salesmanId && !updateData.agentId) {
      updateData.agentId = updateData.salesmanId;
    }

    const property = await assertRecordInCompany(Property, id, req);

    const oldImages = property.images;

    await property.update(updateData);

    if (images !== undefined) {
      const persisted = await persistImagesArray(
        Array.isArray(images) ? images : [],
        'property',
        property.id
      );
      await removeOrphanedUploads(oldImages, persisted, 'property', property.id);
      await property.update({ images: persisted });
    }

    const updatedProperty = await Property.findByPk(property.id, {
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: { property: updatedProperty }
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    next(error);
  }
};

// Delete property
const deleteProperty = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    let property;
    try {
      property = await assertRecordInCompany(Property, id, req, { transaction });
    } catch (e) {
      await transaction.rollback();
      if (e.statusCode === 404) {
        return res.status(404).json({ success: false, message: 'Property not found' });
      }
      throw e;
    }

    // Check for ANY associated Units
    const unitCount = await Unit.count({
      where: { propertyId: id },
      transaction
    });

    if (unitCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot delete property. It has ${unitCount} associated unit(s). Please delete all units first.`
      });
    }

    // Double check for leases just in case (though if 0 units, likely 0 valid leases for this property, but good for safety)
    // Actually if 0 units, there can't be unit-leases. 

    // Proceed with property deletion


    await property.destroy({ transaction });

    await transaction.commit();

    await deleteEntityUploadDir('property', id);

    res.json({
      success: true,
      message: 'Property and associated units deleted successfully'
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    // Improve error message for constraints
    if (error.name === 'SequelizeForeignKeyConstraintError') {
         return res.status(400).json({
             success: false,
             message: 'Cannot delete property because it has related records (e.g. Financial Transactions, Budgets) that prevent deletion.'
         });
    }
    next(error);
  }
};

// Get property matches for a lead
const getPropertyMatches = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const lead = await Lead.findByPk(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    // Calculate match scores for all available properties
    const properties = await Property.findAll({
      where: { availability: 'available' },
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    // Calculate match scores
    const propertiesWithScores = properties.map(property => {
      const matchScore = calculateMatchScore(property, lead);
      return {
        ...property.toJSON(),
        matchScore
      };
    });

    // Sort by match score
    propertiesWithScores.sort((a, b) => b.matchScore - a.matchScore);

    // Pagination
    const offset = (page - 1) * limit;
    const paginatedProperties = propertiesWithScores.slice(offset, offset + parseInt(limit));

    res.json({
      success: true,
      data: {
        properties: paginatedProperties,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(propertiesWithScores.length / limit),
          totalItems: propertiesWithScores.length,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Add property to lead favorites
const addToFavorites = async (req, res, next) => {
  try {
    const { leadId, propertyId } = req.params;

    const [leadProperty, created] = await LeadProperty.findOrCreate({
      where: {
        leadId,
        propertyId
      },
      defaults: {
        leadId,
        propertyId,
        isFavorite: true,
        matchScore: 0 // Will be calculated separately
      }
    });

    if (!created) {
      await leadProperty.update({ isFavorite: true });
    }

    res.json({
      success: true,
      message: 'Property added to favorites',
      data: { leadProperty }
    });
  } catch (error) {
    next(error);
  }
};

// Remove property from lead favorites
const removeFromFavorites = async (req, res, next) => {
  try {
    const { leadId, propertyId } = req.params;

    const leadProperty = await LeadProperty.findOne({
      where: {
        leadId,
        propertyId
      }
    });

    if (!leadProperty) {
      return res.status(404).json({
        success: false,
        message: 'Property not found in favorites'
      });
    }

    await leadProperty.update({ isFavorite: false });

    res.json({
      success: true,
      message: 'Property removed from favorites'
    });
  } catch (error) {
    next(error);
  }
};

// Calculate match score between property and lead
const calculateMatchScore = (property, lead) => {
  let totalScore = 0;
  let maxScore = 0;

  // Budget match (25% weight)
  if (lead.budget && property.price) {
    const budgetDiff = Math.abs(property.price - lead.budget) / lead.budget;
    const budgetScore = budgetDiff <= 0.2 ? 25 * (1 - budgetDiff) : 0;
    totalScore += budgetScore;
  }
  maxScore += 25;

  // Location match (20% weight)
  if (lead.preferredLocation && property.location) {
    const locationScore = property.location.toLowerCase().includes(lead.preferredLocation.toLowerCase()) ? 20 : 0;
    totalScore += locationScore;
  }
  maxScore += 20;

  // Bedrooms match (15% weight)
  if (lead.bedrooms && property.bedrooms) {
    const bedroomDiff = Math.abs(property.bedrooms - lead.bedrooms);
    const bedroomScore = bedroomDiff <= 1 ? 15 * (1 - bedroomDiff / 3) : 0;
    totalScore += bedroomScore;
  }
  maxScore += 15;

  // Area match (15% weight)
  if (lead.area && property.area) {
    const areaDiff = Math.abs(property.area - lead.area) / lead.area;
    const areaScore = areaDiff <= 0.15 ? 15 * (1 - areaDiff) : 0;
    totalScore += areaScore;
  }
  maxScore += 15;

  // Property type match (5% weight)
  if (lead.buildingType && property.buildingType) {
    const typeScore = property.buildingType === lead.buildingType ? 5 : 0;
    totalScore += typeScore;
  }
  maxScore += 5;

  // Amenities match (10% weight)
  if (lead.requirements && property.amenities) {
    const leadRequirements = Array.isArray(lead.requirements) ? lead.requirements : [];
    const propertyAmenities = Array.isArray(property.amenities) ? property.amenities : [];
    const matchingAmenities = leadRequirements.filter(req => 
      propertyAmenities.some(amenity => 
        amenity.toLowerCase().includes(req.toLowerCase())
      )
    ).length;
    const amenitiesScore = leadRequirements.length > 0 ? 
      (matchingAmenities / leadRequirements.length) * 10 : 0;
    totalScore += amenitiesScore;
  }
  maxScore += 10;

  // Move-in date match (10% weight)
  if (lead.moveInDate && property.moveInDate) {
    const leadDate = new Date(lead.moveInDate);
    const propertyDate = new Date(property.moveInDate);
    const dateDiff = Math.abs(leadDate - propertyDate) / (1000 * 60 * 60 * 24); // days
    const dateScore = dateDiff <= 30 ? 10 * (1 - dateDiff / 30) : 0;
    totalScore += dateScore;
  }
  maxScore += 10;

  return Math.round((totalScore / maxScore) * 100);
};

// Helper function to extract valid emirate from location string
const extractEmirate = (location) => {
  if (!location) return 'dubai';
  
  const locationLower = location.toLowerCase();
  
  const validEmirates = [
    'dubai',
    'abu_dhabi',
    'sharjah',
    'ajman',
    'ras_al_khaimah',
    'fujairah',
    'umm_al_quwain'
  ];
  
  for (const emirate of validEmirates) {
    const emirateWithSpaces = emirate.replace(/_/g, ' ');
    if (locationLower.includes(emirate) || locationLower.includes(emirateWithSpaces)) {
      return emirate;
    }
  }
  
  return 'dubai';
};

// Helper function to map category to buildingType enum
const mapCategoryToBuildingType = (category) => {
  if (!category) return 'apartment';
  
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('studio')) return 'studio';
  if (categoryLower.includes('penthouse')) return 'penthouse';
  if (categoryLower.includes('villa')) return 'villa';
  if (categoryLower.includes('townhouse')) return 'townhouse';
  if (categoryLower.includes('duplex')) return 'duplex';
  
  if (categoryLower.includes('apartment') || categoryLower.includes('loft')) return 'apartment';
  
  if (categoryLower.includes('office')) return 'office';
  if (categoryLower.includes('retail') || categoryLower.includes('shopping')) return 'retail';
  if (categoryLower.includes('warehouse') || categoryLower.includes('industrial')) return 'warehouse';
  
  return 'apartment';
};

// Import properties from Excel file
const importProperties = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const XLSX = require('xlsx');
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
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

    const propertiesToCreate = [];

    // Validate and process each row
    for (const [index, row] of jsonData.entries()) {
      const rowNumber = index + 2; // Including header row
      const errors = [];

      // Required fields validation
      if (!row['Property Name']) errors.push('Property Name is required');
      if (!row['Location']) errors.push('Location is required');

      if (errors.length > 0) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          messages: errors
        });
        continue;
      }

      // Map excel fields to database fields (ignore any company_id from spreadsheet)
      const propertyData = {
        title: row['Property Name'],
        location: row['Location'],
        community: row['Address'] || '',
        emirate: extractEmirate(row['Location']),
        buildingType: mapCategoryToBuildingType(row['Category'] || row['Type'] || ''),
        type: row['Type'] || 'Residential',
        category: row['Category'] || 'Apartment',
        stock: 0, // Placeholder
        furnished: 'furnished', // Default
        bedrooms: 0,
        bathrooms: 0,
        area: 0,
        price: parseFloat(row['Monthly Revenue']) || 0,
        availability: 'available',
        amenities: [],
        features: {},
        description: '',
        yearBuilt: parseInt(row['Year Built']) || new Date().getFullYear(),
        floors: parseInt(row['Floors']) || 1,
        totalUnits: parseInt(row['Total Units']) || 1,
        unitsPerFloor: 1,
        marketValue: parseFloat(row['Market Value']) || 0,
        monthlyRevenue: parseFloat(row['Monthly Revenue']) || 0,
        maintenanceCost: 0,
        insuranceCost: 0,
        propertyManager: row['Property Manager'] || '',
        managementCompany: '',
        contactEmail: row['Contact Email'] || '',
        contactPhone: row['Contact Phone'] || '',
        ejariStatus: row['Registration status'] || row['Ejari Status'] || 'pending',
        insuranceExpiry: row['Insurance Expiry'] ? new Date(row['Insurance Expiry']) : null,
        agentId: req.user.id
      };

      propertiesToCreate.push(withCompanyId(req, propertyData));
    }

    // Bulk create valid properties
    if (propertiesToCreate.length > 0) {
       await Property.bulkCreate(propertiesToCreate);
       results.success = propertiesToCreate.length;
    }

    res.json({
      success: true,
      message: `Import processed. Success: ${results.success}, Failed: ${results.failed}`,
      data: results
    });

  } catch (error) {
    next(error);
  }
};

// Get property analytics
const getPropertyAnalytics = async (req, res, next) => {
  try {
    const { id } = req.params;
    const property = await assertRecordInCompany(Property, id, req);
    const scope = companyWhere(req);
    const propertyId = Number(id);
    const toNumber = (value) => {
      const parsed = parseFloat(String(value ?? 0));
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const startOfCurrentMonth = new Date();
    startOfCurrentMonth.setDate(1);
    startOfCurrentMonth.setHours(0, 0, 0, 0);

    const endOfCurrentMonth = new Date(startOfCurrentMonth);
    endOfCurrentMonth.setMonth(endOfCurrentMonth.getMonth() + 1);
    endOfCurrentMonth.setMilliseconds(-1);

    const sixMonthsAgo = new Date(startOfCurrentMonth);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

    const startOfAnnualWindow = new Date(startOfCurrentMonth);
    startOfAnnualWindow.setFullYear(startOfAnnualWindow.getFullYear() - 1);

    // 1. Calculate revenue and occupancy from live unit/lease data
    const propertyUnits = await Unit.findAll({
      where: { ...scope, propertyId, isActive: true },
      attributes: ['id', 'unitNumber', 'rentAmount']
    });
    const propertyUnitIds = propertyUnits.map((unit) => unit.id);
    const unitNumberMap = new Map(propertyUnits.map((unit) => [unit.id, unit.unitNumber]));
    const totalUnits = propertyUnits.length;
    const expectedMonthlyRevenue = propertyUnits.reduce(
      (sum, unit) => sum + toNumber(unit.rentAmount),
      0
    );

    const activeLeases = await Lease.findAll({
      where: { ...scope, status: 'active', isActive: true },
      attributes: ['id', 'unitId', 'rentAmount', 'endDate'],
      include: [{
        model: Unit,
        as: 'unit',
        attributes: ['id', 'propertyId'],
        required: true,
        where: { ...scope, propertyId, isActive: true }
      }]
    });
    const occupiedUnits = new Set(
      activeLeases
        .map((lease) => lease.unitId)
        .filter((unitIdValue) => unitIdValue != null)
    ).size;
    const activeLeaseRevenue = activeLeases.reduce(
      (sum, lease) => sum + toNumber(lease.rentAmount),
      0
    );
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    const sixMonthPdcCheques = await Cheque.findAll({
      where: {
        ...scope,
        chequeType: 'pdc',
        isActive: true,
        chequeDate: { [Op.gte]: sixMonthsAgo },
        status: { [Op.notIn]: ['cancelled', 'bounced', 'replaced'] }
      },
      attributes: ['id', 'amount', 'chequeDate'],
      include: [{
        model: Lease,
        as: 'lease',
        attributes: ['id', 'unitId'],
        required: true,
        include: [{
          model: Unit,
          as: 'unit',
          attributes: ['id', 'propertyId'],
          required: true,
          where: { ...scope, propertyId, isActive: true }
        }]
      }]
    });
    const currentMonthPdcRevenue = sixMonthPdcCheques.reduce((sum, cheque) => {
      const chequeDate = new Date(cheque.chequeDate);
      if (chequeDate >= startOfCurrentMonth && chequeDate <= endOfCurrentMonth) {
        return sum + toNumber(cheque.amount);
      }
      return sum;
    }, 0);
    const actualMonthlyRevenue =
      currentMonthPdcRevenue > 0 ? currentMonthPdcRevenue : activeLeaseRevenue;
    const actualRevenueSource =
      currentMonthPdcRevenue > 0 ? 'current_month_pdc' : 'active_leases';

    // 2. Revenue & Expenses (Last 6 Months)
    const propertyExpenseCondition = propertyUnitIds.length > 0
      ? {
          [Op.or]: [
            { propertyId },
            { unitId: { [Op.in]: propertyUnitIds } }
          ]
        }
      : { propertyId };

    const [helpdeskExpensesResult, vendorInvoiceExpensesResult, purchaseInvoiceExpensesResult, directPurchaseLineExpensesResult] =
      await Promise.allSettled([
        Ticket.findAll({
          where: {
            [Op.and]: [
              propertyExpenseCondition,
              {
                [Op.or]: [
                  { actualCost: { [Op.gt]: 0 } },
                  { estimatedCost: { [Op.gt]: 0 } }
                ]
              }
            ]
          },
          attributes: [
            'id',
            'ticketNumber',
            'title',
            'category',
            'status',
            'propertyId',
            'unitId',
            'estimatedCost',
            'actualCost',
            'completedDate',
          ]
        }),
        VendorInvoice.findAll({
          where: {
            ...scope,
            propertyId,
            isActive: true,
            totalAmount: { [Op.gt]: 0 }
          },
          attributes: ['id', 'invoiceNumber', 'description', 'invoiceDate', 'totalAmount', 'propertyId']
        }),
        PurchaseInvoice.findAll({
          where: {
            ...scope,
            ...propertyExpenseCondition,
            totalAmount: { [Op.gt]: 0 }
          },
          attributes: ['id', 'invoiceNumber', 'notes', 'invoiceDate', 'totalAmount', 'propertyId', 'unitId']
        }),
        DirectPurchaseInvoiceLine.findAll({
          where: {
            ...scope,
            ...propertyExpenseCondition,
            totalAmount: { [Op.gt]: 0 }
          },
          attributes: ['id', 'directPurchaseInvoiceId', 'description', 'totalAmount', 'propertyId', 'unitId', 'createdAt'],
          include: [{
            association: 'invoice',
            attributes: ['id', 'dpiNumber', 'invoiceDate']
          }]
        })
      ]);

    if (helpdeskExpensesResult.status === 'rejected') {
      console.error('Property analytics helpdesk expense query failed:', helpdeskExpensesResult.reason);
    }
    if (vendorInvoiceExpensesResult.status === 'rejected') {
      console.error('Property analytics vendor invoice query failed:', vendorInvoiceExpensesResult.reason);
    }
    if (purchaseInvoiceExpensesResult.status === 'rejected') {
      console.error('Property analytics purchase invoice query failed:', purchaseInvoiceExpensesResult.reason);
    }
    if (directPurchaseLineExpensesResult.status === 'rejected') {
      console.error('Property analytics direct purchase query failed:', directPurchaseLineExpensesResult.reason);
    }

    const helpdeskExpenses = helpdeskExpensesResult.status === 'fulfilled' ? helpdeskExpensesResult.value : [];
    const vendorInvoiceExpenses = vendorInvoiceExpensesResult.status === 'fulfilled' ? vendorInvoiceExpensesResult.value : [];
    const purchaseInvoiceExpenses = purchaseInvoiceExpensesResult.status === 'fulfilled' ? purchaseInvoiceExpensesResult.value : [];
    const directPurchaseLineExpenses = directPurchaseLineExpensesResult.status === 'fulfilled' ? directPurchaseLineExpensesResult.value : [];

    const expenseItems = [
      ...helpdeskExpenses.map((ticket) => ({
        id: `ticket-${ticket.id}`,
        source: 'Helpdesk',
        category: ticket.category || 'Maintenance',
        reference: ticket.ticketNumber || `Ticket #${ticket.id}`,
        description: ticket.title || 'Maintenance ticket expense',
        amount: toNumber(ticket.actualCost) || toNumber(ticket.estimatedCost),
        date: ticket.completedDate || ticket.updatedAt || ticket.createdAt,
        unitNumber: unitNumberMap.get(ticket.unitId) || null,
      })),
      ...vendorInvoiceExpenses.map((invoice) => ({
        id: `vendor-${invoice.id}`,
        source: 'Vendor Invoice',
        category: 'Property Invoice',
        reference: invoice.invoiceNumber || `Vendor Invoice #${invoice.id}`,
        description: invoice.description || 'Property-level vendor invoice',
        amount: toNumber(invoice.totalAmount),
        date: invoice.invoiceDate,
        unitNumber: null,
      })),
      ...purchaseInvoiceExpenses.map((invoice) => ({
        id: `purchase-${invoice.id}`,
        source: 'Purchase Invoice',
        category: invoice.unitId ? 'Unit Invoice' : 'Property Invoice',
        reference: invoice.invoiceNumber || `Purchase Invoice #${invoice.id}`,
        description: invoice.notes || 'Purchase invoice expense',
        amount: toNumber(invoice.totalAmount),
        date: invoice.invoiceDate,
        unitNumber: unitNumberMap.get(invoice.unitId) || null,
      })),
      ...directPurchaseLineExpenses.map((line) => ({
        id: `direct-${line.id}`,
        source: 'Direct Purchase Invoice',
        category: line.unitId ? 'Unit Expense' : 'Property Expense',
        reference: line.invoice?.dpiNumber || `Direct Purchase #${line.directPurchaseInvoiceId || line.id}`,
        description: line.description || 'Direct purchase invoice line',
        amount: toNumber(line.totalAmount),
        date: line.invoice?.invoiceDate || line.createdAt,
        unitNumber: unitNumberMap.get(line.unitId) || null,
      })),
    ]
      .filter((item) => item.amount > 0 && item.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Process transactions into monthly data
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const revenueData = [];
    const expenseBreakdownMap = {};
    const occupancyData = [];

    for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const monthNum = d.getMonth() + 1;
        const yearNum = d.getFullYear();
        
        let monthRevenue = 0;
        let monthExpenses = 0;

        sixMonthPdcCheques.forEach((cheque) => {
            const chequeDate = new Date(cheque.chequeDate);
            if (chequeDate.getMonth() + 1 === monthNum && chequeDate.getFullYear() === yearNum) {
                monthRevenue += toNumber(cheque.amount);
            }
        });

        expenseItems.forEach((item) => {
            const expenseDate = new Date(item.date);
            if (expenseDate.getMonth() + 1 === monthNum && expenseDate.getFullYear() === yearNum) {
                monthExpenses += item.amount;
                if (!expenseBreakdownMap[item.source]) expenseBreakdownMap[item.source] = 0;
                expenseBreakdownMap[item.source] += item.amount;
            }
        });

        revenueData.push({
            month: monthNames[monthNum - 1],
            revenue: Math.round(monthRevenue),
            expectedRevenue: Math.round(expectedMonthlyRevenue),
            expenses: Math.round(monthExpenses)
        });
        occupancyData.push({
          month: monthNames[monthNum - 1],
          occupancy: Math.round(occupancyRate)
        });
    }

    // Format expense breakdown
    const expenseBreakdown = Object.keys(expenseBreakdownMap).map(category => ({
        name: category,
        value: Math.round(expenseBreakdownMap[category])
    }));

    // If no expenses, add default categories from property fields
    if (expenseBreakdown.length === 0) {
        if (toNumber(property.maintenanceCost) > 0) expenseBreakdown.push({ name: 'Maintenance', value: toNumber(property.maintenanceCost) });
        if (toNumber(property.insuranceCost) > 0) expenseBreakdown.push({ name: 'Insurance', value: toNumber(property.insuranceCost) });
    }

    // 3. Calculate ROI
    const annualRentalIncome = activeLeaseRevenue * 12;
    const annualExpensesFromTransactions = expenseItems
      .filter((item) => {
        const date = new Date(item.date);
        return date >= startOfAnnualWindow && date <= endOfCurrentMonth;
      })
      .reduce((sum, item) => sum + item.amount, 0);
    const annualExpensesFallback =
      toNumber(property.maintenanceCost) + toNumber(property.insuranceCost);
    const annualExpenses =
      annualExpensesFromTransactions > 0 ? annualExpensesFromTransactions : annualExpensesFallback;
    const totalPropertyCost =
      toNumber(property.price) || toNumber(property.marketValue) || 0;
    const roi =
      totalPropertyCost > 0
        ? ((annualRentalIncome - annualExpenses) / totalPropertyCost) * 100
        : 0;

    res.json({
      success: true,
      data: {
        property: {
            id: property.id,
            name: property.title,
            location: property.location,
            type: property.type || property.buildingType,
            revenue: actualMonthlyRevenue,
            expectedMonthlyRevenue,
            actualMonthlyRevenue,
            currentMonthPdcRevenue,
            activeLeaseRevenue,
            actualRevenueSource,
            occupancyRate: Math.round(occupancyRate),
            occupiedUnits,
            totalUnits,
            marketValue: toNumber(property.marketValue),
            totalPropertyCost,
            annualRentalIncome,
            annualExpenses,
            roi: parseFloat(roi.toFixed(1)),
            energyRating: null,
            ejariStatus: property.ejariStatus || 'active',
            insuranceExpiry: property.insuranceExpiry,
            compliance: property.compliance,
            maintenanceStatus: 'good',
            leaseExpirations: activeLeases.filter((lease) => {
              const expiryCutoff = new Date();
              expiryCutoff.setMonth(expiryCutoff.getMonth() + 3);
              return lease.endDate && new Date(lease.endDate) < expiryCutoff;
            }).length,
            upcomingRenovations: 0
        },
        revenueData,
        occupancyData,
        expenseBreakdown,
        expenseItems
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertyMatches,
  addToFavorites,
  removeFromFavorites,
  importProperties,
  getPropertyAnalytics
};
