const { Property, User, Lead, LeadProperty } = require('../models');
const { Op } = require('sequelize');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');

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
      sortOrder = 'desc'
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

    // Emirate filter
    if (emirate) {
      whereClause.emirate = emirate;
    }

    // Building type filter
    if (buildingType) {
      whereClause.buildingType = buildingType;
    }

    // Availability filter
    if (availability) {
      whereClause.availability = availability;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) whereClause.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) whereClause.price[Op.lte] = parseFloat(maxPrice);
    }

    const { count, rows: properties } = await Property.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'agent',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
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
    const propertyData = req.body;
    propertyData.agentId = propertyData.agentId || req.user.id;

    const property = await Property.create(propertyData);

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
    const updateData = req.body;

    const property = await Property.findByPk(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    await property.update(updateData);

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
  try {
    const { id } = req.params;

    const property = await Property.findByPk(id);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found'
      });
    }

    await property.destroy();

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
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

module.exports = {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertyMatches,
  addToFavorites,
  removeFromFavorites
};
