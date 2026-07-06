'use strict';

const { BaseValuationProvider } = require('./BaseValuationProvider');
const valuationService = require('../investmentValuation.service');

class ManualValuationProvider extends BaseValuationProvider {
  constructor() {
    super('MANUAL');
  }

  async createValuation(req, payload) {
    return valuationService.createValuationDirect(req, {
      ...payload,
      valuationSource: 'MANUAL',
    });
  }
}

module.exports = { ManualValuationProvider };
