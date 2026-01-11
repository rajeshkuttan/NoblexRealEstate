/**
 * Exchange Rate Controller
 * Handles multi-currency exchange rate management
 * Part of: Phase 3.6 - Multi-Currency Support
 */

const { ExchangeRate, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const exchangeRateService = require('../services/exchangeRateService');

/**
 * Get all exchange rates
 */
exports.getAllExchangeRates = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      fromCurrency = '',
      toCurrency = '',
      effectiveDate = '',
      sortBy = 'effectiveDate',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { isActive: true };

    if (fromCurrency) whereClause.fromCurrency = fromCurrency;
    if (toCurrency) whereClause.toCurrency = toCurrency;
    if (effectiveDate) {
      whereClause.effectiveDate = {
        [Op.lte]: new Date(effectiveDate)
      };
    }

    const { count, rows: exchangeRates } = await ExchangeRate.findAndCountAll({
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
        exchangeRates,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all exchange rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exchange rates',
      error: error.message
    });
  }
};

/**
 * Get exchange rate by ID
 */
exports.getExchangeRateById = async (req, res) => {
  try {
    const { id } = req.params;

    const exchangeRate = await ExchangeRate.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!exchangeRate) {
      return res.status(404).json({
        success: false,
        message: 'Exchange rate not found'
      });
    }

    res.status(200).json({
      success: true,
      data: exchangeRate
    });
  } catch (error) {
    console.error('Get exchange rate by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exchange rate',
      error: error.message
    });
  }
};

/**
 * Get latest exchange rate for a currency pair
 */
exports.getLatestRate = async (req, res) => {
  try {
    const { fromCurrency, toCurrency } = req.query;

    if (!fromCurrency || !toCurrency) {
      return res.status(400).json({
        success: false,
        message: 'fromCurrency and toCurrency are required'
      });
    }

    const exchangeRate = await ExchangeRate.findOne({
      where: {
        fromCurrency,
        toCurrency,
        isActive: true,
        effectiveDate: {
          [Op.lte]: new Date()
        }
      },
      order: [['effectiveDate', 'DESC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!exchangeRate) {
      return res.status(404).json({
        success: false,
        message: `No exchange rate found for ${fromCurrency} to ${toCurrency}`
      });
    }

    res.status(200).json({
      success: true,
      data: exchangeRate
    });
  } catch (error) {
    console.error('Get latest rate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest exchange rate',
      error: error.message
    });
  }
};

/**
 * Create exchange rate
 */
exports.createExchangeRate = async (req, res) => {
  try {
    const {
      fromCurrency,
      toCurrency,
      rate,
      effectiveDate,
      source
    } = req.body;

    // Check for duplicate rate on same effective date
    const existingRate = await ExchangeRate.findOne({
      where: {
        fromCurrency,
        toCurrency,
        effectiveDate: new Date(effectiveDate),
        isActive: true
      }
    });

    if (existingRate) {
      return res.status(400).json({
        success: false,
        message: 'Exchange rate already exists for this currency pair on this date'
      });
    }

    const exchangeRate = await ExchangeRate.create({
      fromCurrency,
      toCurrency,
      rate: parseFloat(rate),
      effectiveDate: new Date(effectiveDate),
      source: source || 'manual',
      createdBy: req.user.id
    });

    const createdRate = await ExchangeRate.findByPk(exchangeRate.id, {
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
      message: 'Exchange rate created successfully',
      data: createdRate
    });
  } catch (error) {
    console.error('Create exchange rate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create exchange rate',
      error: error.message
    });
  }
};

/**
 * Update exchange rate
 */
exports.updateExchangeRate = async (req, res) => {
  try {
    const { id } = req.params;
    const { rate, effectiveDate, source } = req.body;

    const exchangeRate = await ExchangeRate.findOne({
      where: { id, isActive: true }
    });

    if (!exchangeRate) {
      return res.status(404).json({
        success: false,
        message: 'Exchange rate not found'
      });
    }

    await exchangeRate.update({
      rate: rate !== undefined ? parseFloat(rate) : exchangeRate.rate,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : exchangeRate.effectiveDate,
      source: source || exchangeRate.source
    });

    const updatedRate = await ExchangeRate.findByPk(id, {
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
      message: 'Exchange rate updated successfully',
      data: updatedRate
    });
  } catch (error) {
    console.error('Update exchange rate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update exchange rate',
      error: error.message
    });
  }
};

/**
 * Delete exchange rate
 */
exports.deleteExchangeRate = async (req, res) => {
  try {
    const { id } = req.params;

    const exchangeRate = await ExchangeRate.findOne({
      where: { id, isActive: true }
    });

    if (!exchangeRate) {
      return res.status(404).json({
        success: false,
        message: 'Exchange rate not found'
      });
    }

    await exchangeRate.update({ isActive: false });

    res.status(200).json({
      success: true,
      message: 'Exchange rate deleted successfully'
    });
  } catch (error) {
    console.error('Delete exchange rate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete exchange rate',
      error: error.message
    });
  }
};

/**
 * Convert amount between currencies
 */
exports.convertCurrency = async (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency, date } = req.query;

    if (!amount || !fromCurrency || !toCurrency) {
      return res.status(400).json({
        success: false,
        message: 'amount, fromCurrency, and toCurrency are required'
      });
    }

    // Same currency - no conversion needed
    if (fromCurrency === toCurrency) {
      return res.status(200).json({
        success: true,
        data: {
          fromCurrency,
          toCurrency,
          amount: parseFloat(amount),
          convertedAmount: parseFloat(amount),
          rate: 1.0,
          effectiveDate: new Date()
        }
      });
    }

    // Get latest rate
    const exchangeRate = await ExchangeRate.findOne({
      where: {
        fromCurrency,
        toCurrency,
        isActive: true,
        effectiveDate: {
          [Op.lte]: date ? new Date(date) : new Date()
        }
      },
      order: [['effectiveDate', 'DESC']]
    });

    if (!exchangeRate) {
      return res.status(404).json({
        success: false,
        message: `No exchange rate found for ${fromCurrency} to ${toCurrency}`
      });
    }

    const convertedAmount = parseFloat(amount) * parseFloat(exchangeRate.rate);

    res.status(200).json({
      success: true,
      data: {
        fromCurrency,
        toCurrency,
        amount: parseFloat(amount),
        convertedAmount,
        rate: parseFloat(exchangeRate.rate),
        effectiveDate: exchangeRate.effectiveDate
      }
    });
  } catch (error) {
    console.error('Convert currency error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert currency',
      error: error.message
    });
  }
};

/**
 * Get exchange rate statistics
 */
exports.getExchangeRateStats = async (req, res) => {
  try {
    const totalRates = await ExchangeRate.count({
      where: { isActive: true }
    });

    const currencyPairs = await ExchangeRate.findAll({
      where: { isActive: true },
      attributes: [
        'fromCurrency',
        'toCurrency',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['fromCurrency', 'toCurrency'],
      raw: true
    });

    const sourceCounts = await ExchangeRate.findAll({
      where: { isActive: true },
      attributes: [
        'source',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['source'],
      raw: true
    });

    res.status(200).json({
      success: true,
      data: {
        totalRates,
        currencyPairs,
        sourceCounts
      }
    });
  } catch (error) {
    console.error('Get exchange rate stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exchange rate statistics',
      error: error.message
    });
  }
};

/**
 * Update rates from external API
 */
exports.updateRatesFromAPI = async (req, res) => {
  try {
    const result = await exchangeRateService.updateRatesFromAPI(req.user.id);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: `Successfully updated ${result.count} exchange rates`,
        data: result
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to update rates from API',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Update rates from API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update exchange rates',
      error: error.message
    });
  }
};

/**
 * Get latest rate for currency pair
 */
exports.getLatestRate = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Both from and to currencies are required'
      });
    }

    const result = await exchangeRateService.getLatestRate(from, to);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get latest rate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get latest rate',
      error: error.message
    });
  }
};

/**
 * Convert amount between currencies
 */
exports.convertAmount = async (req, res) => {
  try {
    const { amount, from, to } = req.body;

    if (!amount || !from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Amount, from, and to currencies are required'
      });
    }

    const result = await exchangeRateService.convertAmount(
      parseFloat(amount),
      from,
      to
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Convert amount error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert amount',
      error: error.message
    });
  }
};

/**
 * Calculate FX gain/loss
 */
exports.calculateFXGainLoss = async (req, res) => {
  try {
    const { originalAmount, originalCurrency, targetCurrency, originalRate } = req.body;

    if (!originalAmount || !originalCurrency || !targetCurrency || !originalRate) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const result = await exchangeRateService.calculateFXGainLoss(
      parseFloat(originalAmount),
      originalCurrency,
      targetCurrency,
      parseFloat(originalRate)
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Calculate FX gain/loss error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate FX gain/loss',
      error: error.message
    });
  }
};

/**
 * Get historical rates
 */
exports.getHistoricalRates = async (req, res) => {
  try {
    const { from, to, startDate, endDate } = req.query;

    if (!from || !to || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'From, to, startDate, and endDate are required'
      });
    }

    const result = await exchangeRateService.getHistoricalRates(
      from,
      to,
      startDate,
      endDate
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get historical rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get historical rates',
      error: error.message
    });
  }
};

/**
 * Get supported currencies
 */
exports.getSupportedCurrencies = async (req, res) => {
  try {
    const currencies = exchangeRateService.getSupportedCurrencies();
    
    res.status(200).json({
      success: true,
      data: {
        currencies,
        baseCurrency: 'AED'
      }
    });
  } catch (error) {
    console.error('Get supported currencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get supported currencies',
      error: error.message
    });
  }
};
