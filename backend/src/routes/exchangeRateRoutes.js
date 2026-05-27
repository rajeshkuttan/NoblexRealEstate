/**
 * Exchange Rate Routes
 * API routes for multi-currency exchange rate management
 * Part of: Phase 3.6 - Multi-Currency Support
 */

const express = require('express');
const router = express.Router();
const exchangeRateController = require('../controllers/exchangeRateController');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.use(resolveCompanyContext);

router.get('/', exchangeRateController.getAllExchangeRates);
router.get('/stats', exchangeRateController.getExchangeRateStats);
router.get('/supported-currencies', exchangeRateController.getSupportedCurrencies);
router.get('/historical', exchangeRateController.getHistoricalRates);
router.get('/latest-rate', exchangeRateController.getLatestRate);
router.get('/:id', exchangeRateController.getExchangeRateById);
router.post('/', exchangeRateController.createExchangeRate);
router.post('/update-from-api', exchangeRateController.updateRatesFromAPI);
router.post('/convert', exchangeRateController.convertAmount);
router.post('/fx-gain-loss', exchangeRateController.calculateFXGainLoss);
router.put('/:id', exchangeRateController.updateExchangeRate);
router.delete('/:id', exchangeRateController.deleteExchangeRate);

module.exports = router;

