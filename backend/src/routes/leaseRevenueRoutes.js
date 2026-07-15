const express = require('express');
const router = express.Router();
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');
const controller = require('../controllers/leaseRevenueController');

const P = (action) => requirePermission(`module:lease_revenue:${action}`);

router.use(authenticateToken);
router.use(resolveCompanyContext);

router.get('/dashboard', P('view'), controller.getDashboard);
router.get('/reports/:type', P('view'), controller.getReport);

router.get('/settings', P('settings'), controller.getSettings);
router.put('/settings', P('settings'), controller.updateSettings);

router.get('/posting-queue', P('post'), controller.getPostingQueue);
router.post('/posting-batches', P('post'), controller.createPostingBatch);
router.post('/posting-batches/:id/process', P('post'), controller.processPostingBatch);

router.get('/', P('view'), controller.listSchedules);
router.post('/', P('create'), controller.createSchedule);
router.post('/generate-from-lease', P('create'), controller.generateFromLease);

router.post('/amendments/:id/approve', P('amend'), controller.approveAmendment);
router.post('/amendments/:id/reject', P('amend'), controller.rejectAmendment);

router.post('/reconciliations/:id/resolve', P('reconcile'), controller.resolveReconciliation);

router.get('/:id', P('view'), controller.getSchedule);
router.put('/:id', P('update'), controller.updateSchedule);
router.delete('/:id', P('delete'), controller.deleteSchedule);

router.post('/:id/clone', P('create'), controller.cloneSchedule);
router.post('/:id/generate-schedule', P('generate_schedule'), controller.generateSchedule);
router.post('/:id/regenerate-schedule', P('generate_schedule'), controller.regenerateSchedule);

router.post('/:id/submit', P('submit'), controller.submit);
router.post('/:id/approve', P('approve'), controller.approve);
router.post('/:id/reject', P('approve'), controller.reject);
router.post('/:id/activate', P('approve'), controller.activate);
router.post('/:id/terminate', P('terminate'), controller.terminate);
router.post('/:id/cancel', P('delete'), controller.cancel);

router.post('/:id/post-lines', P('post'), controller.postLines);
router.post('/:id/lines/:lineId/post', P('post'), controller.postLine);
router.post('/:id/lines/:lineId/reverse', P('reverse'), controller.reverseLine);
router.post('/:id/lines/:lineId/repost', P('post'), controller.repostLine);

router.post('/:id/amendments', P('amend'), controller.createAmendment);
router.post('/:id/reconcile', P('reconcile'), controller.reconcile);

module.exports = router;
