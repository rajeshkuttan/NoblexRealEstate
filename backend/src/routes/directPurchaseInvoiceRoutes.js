const express = require('express');
const router = express.Router();
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');
const controller = require('../controllers/directPurchaseInvoiceController');

router.use(authenticateToken);
router.use(resolveCompanyContext);

router.get(
  '/open-payables',
  requirePermission('module:finance:direct_purchase_invoice:view'),
  controller.getOpenPayables
);
router.get(
  '/',
  requirePermission('module:finance:direct_purchase_invoice:view'),
  controller.getAll
);
router.get(
  '/:id',
  requirePermission('module:finance:direct_purchase_invoice:view'),
  controller.getById
);
router.post(
  '/',
  requirePermission('module:finance:direct_purchase_invoice:create'),
  controller.create
);
router.put(
  '/:id',
  requirePermission('module:finance:direct_purchase_invoice:update'),
  controller.update
);
router.delete(
  '/:id',
  requirePermission('module:finance:direct_purchase_invoice:delete'),
  controller.remove
);
router.post(
  '/:id/post',
  requirePermission('module:finance:direct_purchase_invoice:post'),
  controller.post
);
router.post(
  '/:id/cancel',
  requirePermission('module:finance:direct_purchase_invoice:cancel'),
  controller.cancel
);

module.exports = router;
