const {
  Property,
  Lead,
  LeadProperty,
  User,
  sequelize,
  Lease,
  Unit,
  FinancialTransaction
} = require('../models');
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');
const {
  persistImagesArray,
  removeOrphanedUploads,
  deleteEntityUploadDir
} = require('../utils/saveEntityImages');

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
    const { page, limit, offset } = normalizePagination(req.query, 10, 100);
    const whereClause = {};

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

    const property = await Property.findByPk(id, {
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

    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    res.json({
      success: true,
      data: { property }
    });
  } catch (error) {
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

    const property = await Property.create({ ...propertyData, images: null });

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

    const property = await Property.findByPk(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

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
    next(error);
  }
};

// Delete property
const deleteProperty = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const property = await Property.findByPk(id);
    if (!property) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
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

      // Map excel fields to database fields
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
        ejariStatus: row['Ejari Status'] || 'pending',
        insuranceExpiry: row['Insurance Expiry'] ? new Date(row['Insurance Expiry']) : null,
        agentId: req.user.id
      };

      propertiesToCreate.push(propertyData);
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
    const property = await Property.findByPk(id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // 1. Calculate Occupancy Rate
    const totalUnits = await Unit.count({ where: { propertyId: id } });
    const occupiedUnits = await Unit.count({ where: { propertyId: id, status: 'occupied' } });
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    // 2. Revenue & Expenses (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1); // Start of month

    // Get real financial transactions
    const transactions = await FinancialTransaction.findAll({
      where: {
        propertyId: id,
        transactionDate: { [Op.gte]: sixMonthsAgo }
      },
      attributes: [
        [sequelize.fn('MONTH', sequelize.col('transaction_date')), 'month'],
        [sequelize.fn('YEAR', sequelize.col('transaction_date')), 'year'],
        'transaction_type',
        'category',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: ['month', 'year', 'transaction_type', 'category'],
      raw: true
    });

    // Process transactions into monthly data
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const revenueData = [];
    const expenseBreakdownMap = {};

    for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const monthNum = d.getMonth() + 1;
        const yearNum = d.getFullYear();
        
        let monthRevenue = 0;
        let monthExpenses = 0;

        // Filter transactions for this month
        transactions.forEach(t => {
            if (t.month === monthNum && t.year === yearNum) {
                const amount = parseFloat(t.total);
                if (t.transaction_type === 'credit' || t.category === 'rent') {
                    monthRevenue += amount;
                } else if (t.transaction_type === 'debit') {
                    monthExpenses += amount;
                    // Aggregate expenses for breakdown
                    if (!expenseBreakdownMap[t.category]) expenseBreakdownMap[t.category] = 0;
                    expenseBreakdownMap[t.category] += amount;
                }
            }
        });

        // Mock data if no real data exists yet (for demo purposes)
        if (monthRevenue === 0 && monthExpenses === 0) {
           // Use property monthly revenue as baseline if available, or random variance
           const baseline = parseFloat(property.monthlyRevenue) || 0;
           monthRevenue = baseline * (0.9 + Math.random() * 0.2); // +/- 10%
           monthExpenses = (parseFloat(property.maintenanceCost) + parseFloat(property.insuranceCost)) / 12 * (0.9 + Math.random() * 0.2);
        }

        revenueData.push({
            month: monthNames[monthNum - 1],
            revenue: Math.round(monthRevenue),
            expenses: Math.round(monthExpenses)
        });
    }

    // Format expense breakdown
    const expenseBreakdown = Object.keys(expenseBreakdownMap).map(category => ({
        name: category.charAt(0).toUpperCase() + category.slice(1),
        value: Math.round(expenseBreakdownMap[category])
    }));

    // If no expenses, add default categories from property fields
    if (expenseBreakdown.length === 0) {
        if (property.maintenanceCost > 0) expenseBreakdown.push({ name: 'Maintenance', value: property.maintenanceCost });
        if (property.insuranceCost > 0) expenseBreakdown.push({ name: 'Insurance', value: property.insuranceCost });
    }

    // 3. Occupancy Trend (Mocked via simple variance for now as precise historical lease capability missing)
    const occupancyData = revenueData.map(d => ({
        month: d.month,
        occupancy: Math.min(100, Math.max(0, Math.round(occupancyRate + (Math.random() * 10 - 5))))
    }));
    // Ensure current month matches actual
    occupancyData[occupancyData.length - 1].occupancy = Math.round(occupancyRate);

    // 4. Calculate ROI
    // (Annual Revenue - Annual Expenses) / Market Value * 100
    const annualRevenue = parseFloat(property.monthlyRevenue) * 12 || 0;
    const annualExpenses = (parseFloat(property.maintenanceCost) + parseFloat(property.insuranceCost)) || 0;
    const marketValue = parseFloat(property.marketValue) || 1; // avoid div by 0
    const roi = marketValue > 0 ? ((annualRevenue - annualExpenses) / marketValue) * 100 : 0;

    res.json({
      success: true,
      data: {
        property: {
            id: property.id,
            name: property.title,
            location: property.location,
            type: property.type || property.buildingType,
            revenue: annualRevenue,
            revenueChange: 5.2, // dynamic calculation requires Prev Year data
            occupancyRate: Math.round(occupancyRate),
            rating: 4.8, // Mock or fetch from reviews
            marketValue: parseFloat(property.marketValue),
            roi: parseFloat(roi.toFixed(1)),
            tenantSatisfaction: 4.5, // Mock
            energyRating: 'A', // Mock or field
            ejariStatus: property.ejariStatus || 'active',
            insuranceExpiry: property.insuranceExpiry,
            compliance: property.compliance,
            maintenanceStatus: 'good',
            leaseExpirations: await Lease.count({ 
                where: { 
                    status: 'active',
                    endDate: { [Op.lt]: new Date(new Date().setMonth(new Date().getMonth() + 3)) }, // Expiring in 3 months
                    '$unit.property_id$': id 
                },
                include: [{ model: Unit, as: 'unit', where: { propertyId: id } }]
            }),
            upcomingRenovations: 0
        },
        revenueData,
        occupancyData,
        expenseBreakdown
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
