'use strict';

const { BaseValuationProvider } = require('./BaseValuationProvider');

class ApiValuationProvider extends BaseValuationProvider {
  constructor() {
    super('API');
  }

  async fetchQuotes(_asset, config) {
    if (!config?.enabled) {
      const err = new Error('Valuation API provider is not enabled');
      err.statusCode = 400;
      throw err;
    }
    const err = new Error('Live valuation API provider is not configured');
    err.statusCode = 501;
    throw err;
  }
}

module.exports = { ApiValuationProvider };
