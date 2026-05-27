/**
 * Financial Forecast Routes
 * API routes for financial forecasting
 * Part of: Phase 3.3 - Forecasting APIs
 */

const express = require('express');
const router = express.Router();
const financialForecastController = require('../controllers/financialForecastController');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.use(resolveCompanyContext);

// Cash flow forecast endpoints
router.post('/cash-flow-forecast', financialForecastController.generateCashFlowForecast);
router.get('/cash-flow-forecast/:id', financialForecastController.getCashFlowForecast);
router.get('/accuracy/:id', financialForecastController.trackForecastAccuracy);

// Standard CRUD endpoints
router.get('/', financialForecastController.getAllForecasts);
router.get('/stats', financialForecastController.getForecastStats);
router.get('/:id', financialForecastController.getForecastById);
router.post('/', financialForecastController.createForecast);
router.put('/:id', financialForecastController.updateForecast);
router.delete('/:id', financialForecastController.deleteForecast);

module.exports = router;

