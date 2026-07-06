const {
  Unit,
  Property,
  Lead,
  User,
  LeadProperty,
  LeadActivity,
  CompanySetting,
} = require('../models');
const { Op } = require('sequelize');

function parseJsonField(value, fallback = []) {
  if (value == null) return fallback;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function normalizeUnitForPublic(unit) {
  const plain = unit.get ? unit.get({ plain: true }) : unit;
  const property = plain.property || null;
  const unitImages = parseJsonField(plain.images, []);
  const propertyImages = property ? parseJsonField(property.images, []) : [];
  const images = unitImages.length > 0 ? unitImages : propertyImages;

  return {
    ...plain,
    images,
    property: property
      ? {
          ...property,
          images: propertyImages,
        }
      : null,
  };
}

async function resolveMarketingCompanyId(queryCompanyId) {
  const envId = process.env.MARKETING_COMPANY_ID;
  if (envId) {
    const id = parseInt(envId, 10);
    const row = await CompanySetting.findOne({ where: { id, isActive: true } });
    if (row) return row.id;
  }

  if (queryCompanyId) {
    const id = parseInt(queryCompanyId, 10);
    if (!Number.isNaN(id)) {
      const row = await CompanySetting.findOne({ where: { id, isActive: true } });
      if (row) return row.id;
    }
  }

  const first = await CompanySetting.findOne({
    where: { isActive: true },
    order: [['id', 'ASC']],
  });
  if (!first) {
    const err = new Error('No active company configured for marketing listings');
    err.statusCode = 503;
    throw err;
  }
  return first.id;
}

async function resolveAssignedSalesman(agentId) {
  if (!agentId) return null;
  const user = await User.findByPk(agentId);
  if (!user) {
    console.warn(`Marketing inquiry: salesman user ${agentId} not found — lead will be unassigned`);
    return null;
  }
  return user.id;
}

/** Public listings — available units only, no auth required */
const getPublicListings = async (req, res, next) => {
  try {
    const companyId = await resolveMarketingCompanyId(req.query.companyId);

    const units = await Unit.findAll({
      where: {
        companyId,
        status: { [Op.in]: ['available', 'Available'] },
      },
      attributes: [
        'id',
        'unitNumber',
        'type',
        'status',
        'area',
        'bedrooms',
        'bathrooms',
        'parking',
        'furnished',
        'rentAmount',
        'depositAmount',
        'description',
        'images',
        'category',
      ],
      include: [
        {
          model: Property,
          as: 'property',
          attributes: [
            'id',
            'title',
            'location',
            'buildingType',
            'floors',
            'agentId',
            'emirate',
            'community',
            'images',
            'price',
          ],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: Math.min(parseInt(req.query.limit, 10) || 200, 200),
    });

    res.json({
      success: true,
      data: {
        units: units.map(normalizeUnitForPublic),
        companyId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/** Public lead inquiry from marketing website */
const submitInquiry = async (req, res, next) => {
  try {
    const companyId = await resolveMarketingCompanyId(req.body.companyId);
    const {
      name,
      email,
      phone,
      message,
      contactMethod,
      unitId,
      propertyId: bodyPropertyId,
      propertyName,
      budget,
      preferredLocation,
      propertyType,
      buildingType,
      requirements,
    } = req.body;

    let unit = null;
    let property = null;
    let assignedTo = null;

    if (unitId) {
      unit = await Unit.findOne({
        where: { id: unitId, companyId },
        include: [
          {
            model: Property,
            as: 'property',
          },
        ],
      });

      if (!unit) {
        return res.status(404).json({
          success: false,
          message: 'Unit not found',
        });
      }

      property = unit.property;
      assignedTo = await resolveAssignedSalesman(property?.agentId);
    } else if (bodyPropertyId) {
      property = await Property.findOne({
        where: { id: bodyPropertyId, companyId },
      });
      if (property) {
        assignedTo = await resolveAssignedSalesman(property.agentId);
      }
    }

    const resolvedPropertyId = property?.id || bodyPropertyId || null;
    const rentAmount = unit ? parseFloat(unit.rentAmount) || 0 : 0;
    const propertyPrice = property ? parseFloat(property.price) || 0 : 0;
    const resolvedBudget = budget || (rentAmount > 0 ? rentAmount : propertyPrice) || null;

    const lead = await Lead.create({
      companyId,
      name,
      email,
      phone,
      company: 'Walk-in Client',
      emiratesId: '000000000000000',
      source: 'Website',
      status: 'new',
      priority: 'medium',
      assignedTo,
      propertyType: propertyType || 'residential',
      buildingType: buildingType || property?.buildingType || null,
      emirate: property?.emirate || 'dubai',
      community: preferredLocation || property?.community || property?.location || null,
      bedrooms: unit?.bedrooms ?? null,
      bathrooms: unit?.bathrooms ?? null,
      area: unit?.area ?? null,
      budget: resolvedBudget,
      requirements: {
        message: message || requirements || null,
        unitId: unitId || null,
        propertyId: resolvedPropertyId,
        contactMethod: contactMethod || 'phone',
      },
      leadScore: 50,
      tags: [
        'website-inquiry',
        unitId ? `unit:${unitId}` : null,
        resolvedPropertyId ? `property:${resolvedPropertyId}` : null,
      ].filter(Boolean),
      notes: [
        propertyName ? `Property Inquiry: ${propertyName}` : null,
        unitId ? `Unit ID: ${unitId}` : null,
        resolvedPropertyId ? `Property ID: ${resolvedPropertyId}` : null,
        message ? `Message: ${message}` : null,
        contactMethod ? `Preferred contact: ${contactMethod}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      nextFollowUp: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    if (resolvedPropertyId) {
      await LeadProperty.create({
        leadId: lead.id,
        propertyId: resolvedPropertyId,
        matchScore: 100,
        contactedAt: new Date(),
      });
    }

    if (assignedTo) {
      try {
        await LeadActivity.create({
          leadId: lead.id,
          userId: assignedTo,
          activityType: 'note',
          title: 'Marketing Website Inquiry',
          description: `New inquiry from ${name} via the public marketing site.`,
        });
      } catch (activityError) {
        console.error('Failed to create marketing lead activity:', activityError.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully',
      data: { leadId: lead.id, assignedTo },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicListings,
  submitInquiry,
};
