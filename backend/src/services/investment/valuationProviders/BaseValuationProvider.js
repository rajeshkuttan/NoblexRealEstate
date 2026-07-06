'use strict';

/**
 * @typedef {object} MarketQuote
 * @property {string} symbol
 * @property {number} price
 * @property {string} [currency]
 * @property {number} [exchangeRate]
 * @property {Date} [asOf]
 * @property {number} [confidence] 0-1
 * @property {'stock'|'gold'|'silver'|'fx'|'fund'|'bond'} [quoteType]
 */

class BaseValuationProvider {
  constructor(name) {
    this.name = name;
  }

  /** @returns {Promise<MarketQuote[]>} */
  async fetchQuotes(_asset, _config) {
    throw new Error(`${this.name}: fetchQuotes not implemented`);
  }

  normalizeQuote(quote) {
    return {
      price: Number(quote.price),
      currency: quote.currency || 'AED',
      exchangeRate: Number(quote.exchangeRate || 1),
      asOf: quote.asOf || new Date(),
      confidence: quote.confidence != null ? Number(quote.confidence) : 1,
      quoteType: quote.quoteType || 'stock',
    };
  }
}

module.exports = { BaseValuationProvider };
