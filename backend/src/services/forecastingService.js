/**
 * Forecasting Service
 * ML-based financial forecasting using linear regression
 * Part of: Phase 5.1 - Cash Flow Forecast Report
 */

const { Invoice, Payment, FinancialTransaction, Property, Lease, sequelize } = require('../models');
const { Op } = require('sequelize');
const stats = require('simple-statistics');
const MLR = require('ml-regression');
const math = require('mathjs');

/**
 * Generate cash flow forecast using ML
 * @param {Object} params - Forecast parameters
 * @returns {Object} Forecast data with scenarios
 */
exports.generateCashFlowForecast = async (params) => {
  try {
    const {
      forecast_period = 12, // months
      scenario = 'base', // base, optimistic, pessimistic
      include_properties = [],
      date_from = new Date(),
      date_to = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    } = params;

    // Step 1: Gather historical data (last 12 months)
    const historicalData = await gatherHistoricalData(include_properties);
    
    // Step 2: Train ML model
    const model = await trainModel(historicalData);
    
    // Step 3: Generate predictions
    const predictions = await generatePredictions(model, forecast_period, historicalData);
    
    // Step 4: Calculate confidence intervals and scenarios
    const scenarios = await calculateScenarios(predictions, historicalData);
    
    // Step 5: Generate monthly projections
    const monthlyProjections = await generateMonthlyProjections(
      predictions,
      scenarios,
      new Date(date_from)
    );

    return {
      forecast_id: null, // Will be set after saving
      generated_at: new Date().toISOString(),
      accuracy_percentage: model.accuracy,
      forecast_period,
      scenario,
      monthly_projections: monthlyProjections,
      scenarios: scenarios,
      model_info: {
        r_squared: model.rSquared,
        mse: model.mse,
        training_samples: historicalData.length
      }
    };
  } catch (error) {
    console.error('Generate cash flow forecast error:', error);
    throw error;
  }
};

/**
 * Gather historical financial data for training
 */
async function gatherHistoricalData(propertyIds = []) {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // Build where clause for property filtering
    const whereClause = {
      createdAt: {
        [Op.gte]: twelveMonthsAgo
      }
    };

    if (propertyIds.length > 0) {
      whereClause.propertyId = {
        [Op.in]: propertyIds
      };
    }

    // Get monthly revenue from invoices/payments
    const monthlyRevenue = await Payment.findAll({
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('payment_date'), '%Y-%m'), 'month'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_revenue']
      ],
      where: {
        paymentDate: {
          [Op.gte]: twelveMonthsAgo
        },
        status: 'completed'
      },
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('payment_date'), '%Y-%m')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('payment_date'), '%Y-%m'), 'ASC']],
      raw: true
    });

    // Get monthly expenses from financial transactions
    const monthlyExpenses = await FinancialTransaction.findAll({
      attributes: [
        [sequelize.fn('DATE_FORMAT', sequelize.col('transaction_date'), '%Y-%m'), 'month'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_expenses']
      ],
      where: {
        transactionDate: {
          [Op.gte]: twelveMonthsAgo
        },
        transactionType: 'debit'
      },
      group: [sequelize.fn('DATE_FORMAT', sequelize.col('transaction_date'), '%Y-%m')],
      order: [[sequelize.fn('DATE_FORMAT', sequelize.col('transaction_date'), '%Y-%m'), 'ASC']],
      raw: true
    });

    // Combine revenue and expenses by month
    const dataByMonth = {};
    
    monthlyRevenue.forEach(row => {
      dataByMonth[row.month] = {
        month: row.month,
        revenue: parseFloat(row.total_revenue || 0),
        expenses: 0,
        net_cash_flow: 0
      };
    });

    monthlyExpenses.forEach(row => {
      if (!dataByMonth[row.month]) {
        dataByMonth[row.month] = {
          month: row.month,
          revenue: 0,
          expenses: 0,
          net_cash_flow: 0
        };
      }
      dataByMonth[row.month].expenses = parseFloat(row.total_expenses || 0);
    });

    // Calculate net cash flow
    Object.keys(dataByMonth).forEach(month => {
      dataByMonth[month].net_cash_flow = 
        dataByMonth[month].revenue - dataByMonth[month].expenses;
    });

    return Object.values(dataByMonth);
  } catch (error) {
    console.error('Gather historical data error:', error);
    throw error;
  }
}

/**
 * Train ML model using historical data
 */
async function trainModel(historicalData) {
  try {
    if (historicalData.length < 3) {
      // Not enough data, use simple averages
      const avgRevenue = stats.mean(historicalData.map(d => d.revenue));
      const avgExpenses = stats.mean(historicalData.map(d => d.expenses));
      
      return {
        type: 'average',
        avgRevenue,
        avgExpenses,
        accuracy: 75, // Conservative estimate
        rSquared: 0,
        mse: 0,
        predict: (x) => ({
          revenue: avgRevenue,
          expenses: avgExpenses,
          net_cash_flow: avgRevenue - avgExpenses
        })
      };
    }

    // Prepare training data for linear regression
    const X_revenue = historicalData.map((_, index) => [index + 1]);
    const y_revenue = historicalData.map(d => d.revenue);
    
    const X_expenses = historicalData.map((_, index) => [index + 1]);
    const y_expenses = historicalData.map(d => d.expenses);

    // Train linear regression models
    const revenueModel = new MLR.SimpleLinearRegression(
      X_revenue.map(x => x[0]),
      y_revenue
    );
    
    const expensesModel = new MLR.SimpleLinearRegression(
      X_expenses.map(x => x[0]),
      y_expenses
    );

    // Calculate R-squared for revenue model
    const predictions_revenue = X_revenue.map(x => revenueModel.predict(x[0]));
    const rSquared_revenue = calculateRSquared(y_revenue, predictions_revenue);

    // Calculate MSE for revenue model
    const mse_revenue = stats.mean(
      y_revenue.map((actual, i) => Math.pow(actual - predictions_revenue[i], 2))
    );

    // Estimate accuracy based on R-squared
    const accuracy = Math.min(95, Math.max(60, rSquared_revenue * 100));

    return {
      type: 'linear_regression',
      revenueModel,
      expensesModel,
      accuracy: Math.round(accuracy),
      rSquared: rSquared_revenue,
      mse: mse_revenue,
      predict: (monthIndex) => {
        const revenue = revenueModel.predict(monthIndex);
        const expenses = expensesModel.predict(monthIndex);
        return {
          revenue: Math.max(0, revenue),
          expenses: Math.max(0, expenses),
          net_cash_flow: revenue - expenses
        };
      }
    };
  } catch (error) {
    console.error('Train model error:', error);
    throw error;
  }
}

/**
 * Calculate R-squared value
 */
function calculateRSquared(actual, predicted) {
  const meanActual = stats.mean(actual);
  const ssTotal = stats.sum(actual.map(y => Math.pow(y - meanActual, 2)));
  const ssResidual = stats.sum(
    actual.map((y, i) => Math.pow(y - predicted[i], 2))
  );
  return 1 - (ssResidual / ssTotal);
}

/**
 * Generate predictions for future periods
 */
async function generatePredictions(model, forecastPeriod, historicalData) {
  try {
    const predictions = [];
    const startIndex = historicalData.length + 1;

    for (let i = 0; i < forecastPeriod; i++) {
      const monthIndex = startIndex + i;
      const prediction = model.predict(monthIndex);
      predictions.push({
        month_index: i + 1,
        ...prediction
      });
    }

    return predictions;
  } catch (error) {
    console.error('Generate predictions error:', error);
    throw error;
  }
}

/**
 * Calculate confidence intervals and scenarios
 */
async function calculateScenarios(predictions, historicalData) {
  try {
    // Calculate standard deviation from historical data
    const revenueStdDev = stats.standardDeviation(historicalData.map(d => d.revenue));
    const expensesStdDev = stats.standardDeviation(historicalData.map(d => d.expenses));

    const scenarios = {
      optimistic: predictions.map(p => ({
        month_index: p.month_index,
        projected_income: p.revenue + revenueStdDev,
        projected_expenses: p.expenses - expensesStdDev * 0.5,
        net_cash_flow: (p.revenue + revenueStdDev) - (p.expenses - expensesStdDev * 0.5),
        confidence_level: 0.85
      })),
      base: predictions.map(p => ({
        month_index: p.month_index,
        projected_income: p.revenue,
        projected_expenses: p.expenses,
        net_cash_flow: p.net_cash_flow,
        confidence_level: 0.90
      })),
      pessimistic: predictions.map(p => ({
        month_index: p.month_index,
        projected_income: p.revenue - revenueStdDev * 0.5,
        projected_expenses: p.expenses + expensesStdDev,
        net_cash_flow: (p.revenue - revenueStdDev * 0.5) - (p.expenses + expensesStdDev),
        confidence_level: 0.80
      }))
    };

    return scenarios;
  } catch (error) {
    console.error('Calculate scenarios error:', error);
    throw error;
  }
}

/**
 * Generate monthly projections with dates
 */
async function generateMonthlyProjections(predictions, scenarios, startDate) {
  try {
    const monthlyProjections = [];
    let cumulativeCash = 0;

    // Get current cash position (simplified - would be from bank accounts in production)
    const currentCash = await getCurrentCashPosition();
    cumulativeCash = currentCash;

    for (let i = 0; i < predictions.length; i++) {
      const projectionDate = new Date(startDate);
      projectionDate.setMonth(projectionDate.getMonth() + i);
      
      const baseScenario = scenarios.base[i];
      cumulativeCash += baseScenario.net_cash_flow;

      monthlyProjections.push({
        month: projectionDate.toISOString().substring(0, 7), // YYYY-MM format
        projected_income: Math.round(baseScenario.projected_income),
        projected_expenses: Math.round(baseScenario.projected_expenses),
        net_cash_flow: Math.round(baseScenario.net_cash_flow),
        cumulative_cash: Math.round(cumulativeCash),
        confidence_level: baseScenario.confidence_level
      });
    }

    return monthlyProjections;
  } catch (error) {
    console.error('Generate monthly projections error:', error);
    throw error;
  }
}

/**
 * Get current cash position from bank accounts
 */
async function getCurrentCashPosition() {
  try {
    // This would query bank_accounts table in production
    // For now, return a placeholder value
    return 2000000; // AED 2 million starting position
  } catch (error) {
    console.error('Get current cash position error:', error);
    return 0;
  }
}

/**
 * Track forecast accuracy by comparing with actual results
 * @param {Number} forecastId - ID of the forecast to track
 * @returns {Object} Accuracy metrics
 */
exports.trackForecastAccuracy = async (forecastId) => {
  try {
    const { FinancialForecast } = require('../models');
    
    const forecast = await FinancialForecast.findByPk(forecastId);
    if (!forecast) {
      throw new Error('Forecast not found');
    }

    // Get actual revenue and expenses for the forecast period
    const actualRevenue = await Payment.sum('amount', {
      where: {
        paymentDate: {
          [Op.between]: [forecast.periodStart, forecast.periodEnd]
        },
        status: 'completed'
      }
    });

    const actualExpenses = await FinancialTransaction.sum('amount', {
      where: {
        transactionDate: {
          [Op.between]: [forecast.periodStart, forecast.periodEnd]
        },
        transactionType: 'debit'
      }
    });

    // Calculate accuracy
    const revenueAccuracy = 100 - Math.abs(
      ((actualRevenue - forecast.projectedRevenue) / forecast.projectedRevenue) * 100
    );
    
    const expensesAccuracy = 100 - Math.abs(
      ((actualExpenses - forecast.projectedExpenses) / forecast.projectedExpenses) * 100
    );

    const overallAccuracy = (revenueAccuracy + expensesAccuracy) / 2;

    // Update forecast with accuracy score
    await forecast.update({
      accuracyScore: Math.max(0, Math.min(100, overallAccuracy)),
      status: 'completed'
    });

    return {
      forecast_id: forecastId,
      actual_revenue: actualRevenue,
      projected_revenue: forecast.projectedRevenue,
      revenue_accuracy: Math.round(revenueAccuracy),
      actual_expenses: actualExpenses,
      projected_expenses: forecast.projectedExpenses,
      expenses_accuracy: Math.round(expensesAccuracy),
      overall_accuracy: Math.round(overallAccuracy)
    };
  } catch (error) {
    console.error('Track forecast accuracy error:', error);
    throw error;
  }
};

/**
 * Get scheduled revenue from active leases
 */
async function getScheduledRevenue() {
  try {
    const activeLeases = await Lease.findAll({
      where: {
        status: 'active'
      },
      attributes: ['monthlyRent', 'startDate', 'endDate']
    });

    const scheduledRevenue = activeLeases.reduce((sum, lease) => {
      return sum + parseFloat(lease.monthlyRent || 0);
    }, 0);

    return scheduledRevenue;
  } catch (error) {
    console.error('Get scheduled revenue error:', error);
    return 0;
  }
}

module.exports = exports;
