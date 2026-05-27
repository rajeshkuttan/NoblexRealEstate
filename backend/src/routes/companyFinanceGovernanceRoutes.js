const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');
const numberSeries = require('../controllers/companyNumberSeriesController');
const financialYears = require('../controllers/financialYearController');
const financialPeriods = require('../controllers/financialPeriodController');
const vatPeriods = require('../controllers/vatPeriodController');
const documentTemplates = require('../controllers/documentTemplateController');
const openingBatches = require('../controllers/openingBalanceBatchController');

const router = express.Router();
router.use(authenticateToken);
router.use(resolveCompanyContext);

router.get('/number-series', numberSeries.list);
router.post('/number-series/seed-defaults', numberSeries.seedDefaults);
router.post('/number-series', numberSeries.create);
router.put('/number-series/:id', numberSeries.update);
router.get('/number-series/preview', numberSeries.preview);

router.get('/financial-years', financialYears.list);
router.post('/financial-years', financialYears.create);
router.post('/financial-years/:id/close', financialYears.close);

router.get('/financial-periods', financialPeriods.list);
router.get('/financial-periods/current-status', financialPeriods.currentStatus);
router.post('/financial-periods/:id/close', financialPeriods.close);
router.post('/financial-periods/:id/open', financialPeriods.open);

router.get('/vat-periods', vatPeriods.list);
router.post('/vat-periods/open', vatPeriods.open);
router.post('/vat-periods/:id/submit', vatPeriods.submit);
router.post('/vat-periods/:id/lock', vatPeriods.lock);

router.get('/document-templates', documentTemplates.list);
router.get('/document-templates/:documentType', documentTemplates.resolve);
router.put('/document-templates', documentTemplates.upsert);

router.get('/opening-balance-batches', openingBatches.list);
router.post('/opening-balance-batches', openingBatches.create);
router.get('/opening-balance-batches/:id', openingBatches.getById);
router.post('/opening-balance-batches/:id/imported', openingBatches.markImported);

module.exports = router;
