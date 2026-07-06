'use strict';

/**
 * @typedef {import('./BaseValuationProvider').MarketQuote} MarketQuote
 */

/**
 * External market data provider contract (future live APIs).
 * @typedef {object} MarketDataProvider
 * @property {string} providerName
 * @property {() => Promise<boolean>} isConfigured
 * @property {(asset: object) => Promise<MarketQuote|null>} fetchListedStockPrice
 * @property {(asset: object) => Promise<MarketQuote|null>} fetchGoldRate
 * @property {(asset: object) => Promise<MarketQuote|null>} fetchSilverRate
 * @property {(asset: object) => Promise<MarketQuote|null>} fetchFxRate
 * @property {(asset: object) => Promise<MarketQuote|null>} fetchFundNav
 * @property {(asset: object) => Promise<MarketQuote|null>} fetchBondPrice
 */

module.exports = {};
