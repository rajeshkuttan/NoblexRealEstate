const { Lead, User, LeadActivity, Property, LeadProperty } = require('../models');
const { Op } = require('sequelize');

// Get all leads with filters and pagination
const getLeads = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      priority = '',
      source = '',
      assignedTo = '',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { company: { [Op.like]: `%${search}%` } }
      ];
    }

    // Status filter
    if (status) {
      whereClause.status = status;
    }

    // Priority filter
    if (priority) {
      whereClause.priority = priority;
    }

    // Source filter
    if (source) {
      whereClause.source = source;
    }

    // Assigned to filter
    if (assignedTo) {
      whereClause.assignedTo = assignedTo;
    }

    const { count, rows: leads } = await Lead.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'assignedUser',
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
        leads,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single lead by ID
const getLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findByPk(id, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'name', 'email', 'phone']
        },
        {
          model: LeadActivity,
          as: 'activities',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email']
            }
          ],
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    res.json({
      success: true,
      data: { lead }
    });
  } catch (error) {
    next(error);
  }
};

// Create new lead
const createLead = async (req, res, next) => {
  try {
    const leadData = req.body;
    leadData.assignedTo = leadData.assignedTo || req.user.id;

    const lead = await Lead.create(leadData);

    // Create initial activity
    await LeadActivity.create({
      leadId: lead.id,
      userId: req.user.id,
      activityType: 'note',
      title: 'Lead Created',
      description: 'Lead was created in the system'
    });

    const createdLead = await Lead.findByPk(lead.id, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: { lead: createdLead }
    });
  } catch (error) {
    next(error);
  }
};

// Update lead
const updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const lead = await Lead.findByPk(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    await lead.update(updateData);

    // Create activity log
    await LeadActivity.create({
      leadId: lead.id,
      userId: req.user.id,
      activityType: 'note',
      title: 'Lead Updated',
      description: 'Lead information was updated'
    });

    const updatedLead = await Lead.findByPk(lead.id, {
      include: [
        {
          model: User,
          as: 'assignedUser',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Lead updated successfully',
      data: { lead: updatedLead }
    });
  } catch (error) {
    next(error);
  }
};

// Delete lead
const deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findByPk(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    await lead.destroy();

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Update lead score
const updateLeadScore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { score } = req.body;

    const lead = await Lead.findByPk(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    await lead.update({ leadScore: score });

    // Create activity log
    await LeadActivity.create({
      leadId: lead.id,
      userId: req.user.id,
      activityType: 'note',
      title: 'Lead Score Updated',
      description: `Lead score updated to ${score}`
    });

    res.json({
      success: true,
      message: 'Lead score updated successfully',
      data: { lead }
    });
  } catch (error) {
    next(error);
  }
};

// Add lead activity
const addLeadActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { activityType, title, description, scheduledAt } = req.body;

    const lead = await Lead.findByPk(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    const activity = await LeadActivity.create({
      leadId: id,
      userId: req.user.id,
      activityType,
      title,
      description,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null
    });

    const createdActivity = await LeadActivity.findByPk(activity.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Activity added successfully',
      data: { activity: createdActivity }
    });
  } catch (error) {
    next(error);
  }
};

// Get lead analytics
const getLeadAnalytics = async (req, res, next) => {
  try {
    const totalLeads = await Lead.count();
    const hotLeads = await Lead.count({ where: { priority: 'high' } });
    const newLeads = await Lead.count({ where: { status: 'new' } });
    const contactedLeads = await Lead.count({ where: { status: 'contacted' } });
    const qualifiedLeads = await Lead.count({ where: { status: 'qualified' } });
    const closedWonLeads = await Lead.count({ where: { status: 'closed_won' } });
    const closedLostLeads = await Lead.count({ where: { status: 'closed_lost' } });

    const avgLeadScore = await Lead.findOne({
      attributes: [
        [Lead.sequelize.fn('AVG', Lead.sequelize.col('lead_score')), 'avgScore']
      ],
      raw: true
    });

    const conversionRate = totalLeads > 0 ? 
      ((closedWonLeads / totalLeads) * 100).toFixed(2) : 0;

    // Status distribution
    const statusDistribution = await Lead.findAll({
      attributes: [
        'status',
        [Lead.sequelize.fn('COUNT', Lead.sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Source distribution
    const sourceDistribution = await Lead.findAll({
      attributes: [
        'source',
        [Lead.sequelize.fn('COUNT', Lead.sequelize.col('id')), 'count']
      ],
      group: ['source'],
      raw: true
    });

    // Recent activities
    const recentActivities = await LeadActivity.findAll({
      include: [
        {
          model: Lead,
          as: 'lead',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalLeads,
          hotLeads,
          newLeads,
          contactedLeads,
          qualifiedLeads,
          closedWonLeads,
          closedLostLeads,
          avgLeadScore: parseFloat(avgLeadScore.avgScore || 0).toFixed(1),
          conversionRate: parseFloat(conversionRate)
        },
        statusDistribution,
        sourceDistribution,
        recentActivities
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  updateLeadScore,
  addLeadActivity,
  getLeadAnalytics
};
