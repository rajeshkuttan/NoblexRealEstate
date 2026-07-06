'use strict';

const { BaseValuationProvider } = require('./BaseValuationProvider');
const valuationService = require('../investmentValuation.service');

class ImportValuationProvider extends BaseValuationProvider {
  constructor() {
    super('IMPORT');
  }

  async importValuations(req, payload) {
    return valuationService.importValuationsDirect(req, payload);
  }
}

module.exports = { ImportValuationProvider };
