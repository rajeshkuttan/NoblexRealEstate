/**
 * Financial Forecast Controller
 * Handles financial forecasting and predictive analytics
 * Part of: Phase 3.3 - Forecasting APIs
 */

const { FinancialForecast, User, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all financial forecasts
 */
exports.getAllForecasts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      forecastType = '',
      status = '',
      sortBy = 'periodStart',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { isActive: true };

    if (forecastType) whereClause.forecastType = forecastType;
    if (status) whereClause.status = status;

    const { count, rows: forecasts } = await FinancialForecast.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      distinct: true
    });

    res.status(200).json({
      success: true,
      data: {
        forecasts,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all forecasts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch forecasts',
      error: error.message
    });
  }
};

/**
 * Get forecast by ID
 */
exports.getForecastById = async (req, res) => {
  try {
    const { id } = req.params;

    const forecast = await FinancialForecast.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!forecast) {
      return res.status(404).json({
        success: false,
        message: 'Forecast not found'
      });
    }

    res.status(200).json({
      success: true,
      data: forecast
    });
  } catch (error) {
    console.error('Get forecast by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch forecast',
      error: error.message
    });
  }
};

/**
 * Create financial forecast
 */
exports.createForecast = async (req, res) => {
  try {
    const {
      forecastName,
      periodStart,
      periodEnd,
      forecastType,
      projectedRevenue,
      projectedExpenses,
      projectedProfit,
      notes
    } = req.body;

    const forecast = await FinancialForecast.create({
      forecastName,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      forecastType,
      projectedRevenue: parseFloat(projectedRevenue || 0),
      projectedExpenses: parseFloat(projectedExpenses || 0),
      projectedProfit: parseFloat(projectedProfit || 0),
      accuracyScore: null,
      status: 'draft',
      notes,
      createdBy: req.user.id
    });

    const createdForecast = await FinancialForecast.findByPk(forecast.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Forecast created successfully',
      data: createdForecast
    });
  } catch (error) {
    console.error('Create forecast error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create forecast',
      error: error.message
    });
  }
};

/**
 * Update forecast
 */
exports.updateForecast = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      forecastName,
      periodStart,
      periodEnd,
      forecastType,
      projectedRevenue,
      projectedExpenses,
      projectedProfit,
      accuracyScore,
      status,
      notes
    } = req.body;

    const forecast = await FinancialForecast.findOne({
      where: { id, isActive: true }
    });

    if (!forecast) {
      return res.status(404).json({
        success: false,
        message: 'Forecast not found'
      });
    }

    await forecast.update({
      forecastName: forecastName || forecast.forecastName,
      periodStart: periodStart ? new Date(periodStart) : forecast.periodStart,
      periodEnd: periodEnd ? new Date(periodEnd) : forecast.periodEnd,
      forecastType: forecastType || forecast.forecastType,
      projectedRevenue: projectedRevenue !== undefined ? parseFloat(projectedRevenue) : forecast.projectedRevenue,
      projectedExpenses: projectedExpenses !== undefined ? parseFloat(projectedExpenses) : forecast.projectedExpenses,
      projectedProfit: projectedProfit !== undefined ? parseFloat(projectedProfit) : forecast.projectedProfit,
      accuracyScore: accuracyScore !== undefined ? parseFloat(accuracyScore) : forecast.accuracyScore,
      status: status || forecast.status,
      notes: notes !== undefined ? notes : forecast.notes
    });

    const updatedForecast = await FinancialForecast.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Forecast updated successfully',
      data: updatedForecast
    });
  } catch (error) {
    console.error('Update forecast error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update forecast',
      error: error.message
    });
  }
};

/**
 * Delete forecast
 */
exports.deleteForecast = async (req, res) => {
  try {
    const { id } = req.params;

    const forecast = await FinancialForecast.findOne({
      where: { id, isActive: true }
    });

    if (!forecast) {
      return res.status(404).json({
        success: false,
        message: 'Forecast not found'
      });
    }

    await forecast.update({ isActive: false });

    res.status(200).json({
      success: true,
      message: 'Forecast deleted successfully'
    });
  } catch (error) {
    console.error('Delete forecast error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete forecast',
      error: error.message
    });
  }
};

/**
 * Get forecast statistics
 */
exports.getForecastStats = async (req, res) => {
  try {
    const totalForecasts = await FinancialForecast.count({
      where: { isActive: true }
    });

    const statusCounts = await FinancialForecast.findAll({
      where: { isActive: true },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const typeCounts = await FinancialForecast.findAll({
      where: { isActive: true },
      attributes: [
        'forecastType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['forecastType'],
      raw: true
    });

    const avgAccuracy = await FinancialForecast.findOne({
      where: {
        isActive: true,
        accuracy_score: { [Op.ne]: null }
      },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('accuracy_score')), 'avgAccuracy']
      ],
      raw: true
    });

    res.status(200).json({
      success: true,
      data: {
        totalForecasts,
        statusCounts,
        typeCounts,
        averageAccuracy: parseFloat(avgAccuracy?.avgAccuracy || 0)
      }
    });
  } catch (error) {
    console.error('Get forecast stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch forecast statistics',
      error: error.message
    });
  }
};

/**
 * Generate ML-based cash flow forecast
 * POST /api/finance/forecasts/cash-flow-forecast
 */
exports.generateCashFlowForecast = async (req, res) => {
  try {
    const forecastingService = require('../services/forecastingService');
    
    const {
      forecast_period = 12,
      scenario = 'base',
      include_properties = [],
      forecast_name = `Cash Flow Forecast - ${new Date().toISOString().substring(0, 10)}`
    } = req.body;

    // Generate forecast using ML service
    const forecastData = await forecastingService.generateCashFlowForecast({
      forecast_period: parseInt(forecast_period),
      scenario,
      include_properties
    });

    // Save forecast to database
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + parseInt(forecast_period));

    const totalProjectedRevenue = forecastData.monthly_projections.reduce(
      (sum, m) => sum + m.projected_income, 0
    );
    const totalProjectedExpenses = forecastData.monthly_projections.reduce(
      (sum, m) => sum + m.projected_expenses, 0
    );

    const forecast = await FinancialForecast.create({
      forecastName: forecast_name,
      periodStart,
      periodEnd,
      forecastType: 'cash_flow',
      projectedRevenue: totalProjectedRevenue,
      projectedExpenses: totalProjectedExpenses,
      projectedProfit: totalProjectedRevenue - totalProjectedExpenses,
      accuracyScore: forecastData.accuracy_percentage,
      status: 'active',
      notes: JSON.stringify({
        model_info: forecastData.model_info,
        monthly_projections: forecastData.monthly_projections,
        scenarios: forecastData.scenarios
      }),
      createdBy: req.user.id
    });

    // Return forecast with full details
    const savedForecast = await FinancialForecast.findByPk(forecast.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Cash flow forecast generated successfully',
      data: {
        forecast: savedForecast,
        forecast_details: {
          ...forecastData,
          forecast_id: forecast.id
        }
      }
    });
  } catch (error) {
    console.error('Generate cash flow forecast error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate cash flow forecast',
      error: error.message
    });
  }
};

/**
 * Get cash flow forecast with detailed projections
 * GET /api/finance/forecasts/cash-flow-forecast/:id
 */
exports.getCashFlowForecast = async (req, res) => {
  try {
    const { id } = req.params;

    const forecast = await FinancialForecast.findOne({
      where: { 
        id, 
        isActive: true,
        forecastType: 'cash_flow'
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!forecast) {
      return res.status(404).json({
        success: false,
        message: 'Cash flow forecast not found'
      });
    }

    // Parse the detailed forecast data from notes
    let forecastDetails = {};
    try {
      forecastDetails = JSON.parse(forecast.notes || '{}');
    } catch (e) {
      console.error('Error parsing forecast notes:', e);
    }

    res.status(200).json({
      success: true,
      data: {
        forecast,
        monthly_projections: forecastDetails.monthly_projections || [],
        scenarios: forecastDetails.scenarios || {},
        model_info: forecastDetails.model_info || {}
      }
    });
  } catch (error) {
    console.error('Get cash flow forecast error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cash flow forecast',
      error: error.message
    });
  }
};

/**
 * Track forecast accuracy
 * GET /api/finance/forecasts/accuracy/:id
 */
exports.trackForecastAccuracy = async (req, res) => {
  try {
    const { id } = req.params;
    const forecastingService = require('../services/forecastingService');

    const accuracyMetrics = await forecastingService.trackForecastAccuracy(id);

    res.status(200).json({
      success: true,
      data: accuracyMetrics
    });
  } catch (error) {
    console.error('Track forecast accuracy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track forecast accuracy',
      error: error.message
    });
  }
};
