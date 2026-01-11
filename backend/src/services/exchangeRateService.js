/**
 * Exchange Rate Service
 * Handles currency conversion and rate updates
 */

const axios = require('axios');
const cron = require('node-cron');
const { ExchangeRate, sequelize } = require('../models');
const { Op } = require('sequelize');

class ExchangeRateService {
  constructor() {
    this.apiKey = process.env.EXCHANGE_RATE_API_KEY;
    this.apiUrl = process.env.EXCHANGE_RATE_API_URL || 'https://api.exchangerate-api.com/v4/latest';
    this.cronJob = null;
    this.baseCurrency = 'AED';
    this.supportedCurrencies = ['AED', 'USD', 'EUR', 'GBP', 'SAR', 'QAR', 'BHD', 'KWD', 'OMR'];
  }

  /**
   * Start the cron job for automatic rate updates
   * Runs daily at 12:00 PM
   */
  startScheduler() {
    if (this.cronJob) {
      console.log('⚠️ Exchange rate scheduler is already running');
      return;
    }

    // Run every day at 12:00 PM
    this.cronJob = cron.schedule('0 12 * * *', async () => {
      console.log('🔄 Running automatic exchange rate update...');
      await this.updateRatesFromAPI();
    });

    // Also run immediately on startup if auto-update is enabled
    if (process.env.EXCHANGE_RATE_AUTO_UPDATE === 'true') {
      setTimeout(async () => {
        console.log('🔄 Running initial exchange rate update...');
        await this.updateRatesFromAPI();
      }, 5000);
    }

    console.log('✅ Exchange rate scheduler started');
  }

  /**
   * Stop the cron job
   */
  stopScheduler() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('⏹️ Exchange rate scheduler stopped');
    }
  }

  /**
   * Fetch exchange rates from external API
   */
  async fetchRatesFromAPI(baseCurrency = 'AED') {
    try {
      const url = this.apiKey 
        ? `${this.apiUrl}/${baseCurrency}?apikey=${this.apiKey}`
        : `${this.apiUrl}/${baseCurrency}`;

      const response = await axios.get(url, { timeout: 10000 });
      
      if (response.data && response.data.rates) {
        return response.data.rates;
      }

      throw new Error('Invalid API response');
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error.message);
      
      // Fallback to hardcoded rates if API fails
      return this.getFallbackRates(baseCurrency);
    }
  }

  /**
   * Get fallback rates (approximate, for offline mode)
   */
  getFallbackRates(baseCurrency = 'AED') {
    const rates = {
      AED: { USD: 0.27, EUR: 0.25, GBP: 0.21, SAR: 1.02, QAR: 0.99, BHD: 0.10, KWD: 0.08, OMR: 0.10, AED: 1 },
      USD: { AED: 3.67, EUR: 0.92, GBP: 0.79, SAR: 3.75, QAR: 3.64, BHD: 0.38, KWD: 0.31, OMR: 0.38, USD: 1 },
      EUR: { AED: 4.00, USD: 1.09, GBP: 0.86, SAR: 4.08, QAR: 3.96, BHD: 0.41, KWD: 0.33, OMR: 0.42, EUR: 1 },
      GBP: { AED: 4.65, USD: 1.27, EUR: 1.16, SAR: 4.75, QAR: 4.61, BHD: 0.48, KWD: 0.39, OMR: 0.49, GBP: 1 },
      SAR: { AED: 0.98, USD: 0.27, EUR: 0.24, GBP: 0.21, QAR: 0.97, BHD: 0.10, KWD: 0.08, OMR: 0.10, SAR: 1 }
    };

    return rates[baseCurrency] || rates.AED;
  }

  /**
   * Update rates from API and store in database
   */
  async updateRatesFromAPI(userId = 1) {
    try {
      console.log('📊 Fetching latest exchange rates...');
      
      const rates = await this.fetchRatesFromAPI(this.baseCurrency);
      const effectiveDate = new Date();
      let updatedCount = 0;

      // Create or update rates for each supported currency
      for (const toCurrency of this.supportedCurrencies) {
        if (toCurrency === this.baseCurrency) continue;

        const rate = rates[toCurrency];
        if (!rate) continue;

        // Check if rate exists for today
        const existing = await ExchangeRate.findOne({
          where: {
            fromCurrency: this.baseCurrency,
            toCurrency,
            effectiveDate: {
              [Op.gte]: new Date(effectiveDate.setHours(0, 0, 0, 0))
            },
            isActive: true
          }
        });

        if (existing) {
          await existing.update({ rate, source: 'api' });
        } else {
          await ExchangeRate.create({
            fromCurrency: this.baseCurrency,
            toCurrency,
            rate,
            effectiveDate: new Date(),
            source: 'api',
            createdBy: userId,
            isActive: true
          });
        }

        updatedCount++;
      }

      console.log(`✅ Updated ${updatedCount} exchange rates`);
      return { success: true, count: updatedCount };
    } catch (error) {
      console.error('❌ Failed to update exchange rates:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get latest exchange rate between two currencies
   */
  async getLatestRate(fromCurrency, toCurrency) {
    try {
      // If same currency, rate is 1
      if (fromCurrency === toCurrency) {
        return { rate: 1, source: 'system' };
      }

      // Try to find rate in database
      const rate = await ExchangeRate.findOne({
        where: {
          fromCurrency,
          toCurrency,
          isActive: true
        },
        order: [['effectiveDate', 'DESC']]
      });

      if (rate) {
        return { 
          rate: parseFloat(rate.rate), 
          source: rate.source,
          effectiveDate: rate.effectiveDate
        };
      }

      // If not found, try reverse rate
      const reverseRate = await ExchangeRate.findOne({
        where: {
          fromCurrency: toCurrency,
          toCurrency: fromCurrency,
          isActive: true
        },
        order: [['effectiveDate', 'DESC']]
      });

      if (reverseRate) {
        return { 
          rate: 1 / parseFloat(reverseRate.rate), 
          source: reverseRate.source,
          effectiveDate: reverseRate.effectiveDate
        };
      }

      // Fallback: fetch from API
      const rates = await this.fetchRatesFromAPI(fromCurrency);
      if (rates[toCurrency]) {
        return { 
          rate: rates[toCurrency], 
          source: 'api',
          effectiveDate: new Date()
        };
      }

      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    } catch (error) {
      console.error('Get latest rate error:', error);
      throw error;
    }
  }

  /**
   * Convert amount from one currency to another
   */
  async convertAmount(amount, fromCurrency, toCurrency) {
    try {
      if (fromCurrency === toCurrency) {
        return {
          originalAmount: amount,
          convertedAmount: amount,
          rate: 1,
          fromCurrency,
          toCurrency
        };
      }

      const { rate, source, effectiveDate } = await this.getLatestRate(fromCurrency, toCurrency);
      const convertedAmount = amount * rate;

      return {
        originalAmount: amount,
        convertedAmount: parseFloat(convertedAmount.toFixed(2)),
        rate,
        fromCurrency,
        toCurrency,
        source,
        effectiveDate
      };
    } catch (error) {
      console.error('Convert amount error:', error);
      throw error;
    }
  }

  /**
   * Calculate FX gain/loss on revaluation
   */
  async calculateFXGainLoss(originalAmount, originalCurrency, targetCurrency, originalRate) {
    try {
      const { rate: currentRate } = await this.getLatestRate(originalCurrency, targetCurrency);
      
      const originalConverted = originalAmount * originalRate;
      const currentConverted = originalAmount * currentRate;
      const fxGainLoss = currentConverted - originalConverted;

      return {
        originalAmount,
        originalCurrency,
        targetCurrency,
        originalRate,
        currentRate,
        originalConverted,
        currentConverted,
        fxGainLoss: parseFloat(fxGainLoss.toFixed(2)),
        isGain: fxGainLoss > 0
      };
    } catch (error) {
      console.error('Calculate FX gain/loss error:', error);
      throw error;
    }
  }

  /**
   * Get historical rates for a currency pair
   */
  async getHistoricalRates(fromCurrency, toCurrency, startDate, endDate) {
    try {
      const rates = await ExchangeRate.findAll({
        where: {
          fromCurrency,
          toCurrency,
          effectiveDate: {
            [Op.between]: [new Date(startDate), new Date(endDate)]
          },
          isActive: true
        },
        order: [['effectiveDate', 'ASC']]
      });

      return rates.map(r => ({
        date: r.effectiveDate,
        rate: parseFloat(r.rate),
        source: r.source
      }));
    } catch (error) {
      console.error('Get historical rates error:', error);
      throw error;
    }
  }

  /**
   * Get all supported currency pairs
   */
  getSupportedCurrencies() {
    return this.supportedCurrencies;
  }
}

// Create singleton instance
const exchangeRateService = new ExchangeRateService();

module.exports = exchangeRateService;
