const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Tenant routes
router.get('/', tenantController.getAllTenants);
router.get('/stats', tenantController.getTenantStats);
router.get('/options', tenantController.getTenantOptions);
router.get('/:id', tenantController.getTenantById);
router.post('/', tenantController.createTenant);
router.put('/:id', tenantController.updateTenant);
router.delete('/:id', tenantController.deleteTenant);
router.get('/:id/payment-behavior', tenantController.getTenantPaymentBehavior);
router.get('/:id/renewal-evaluation', tenantController.getTenantRenewalEvaluation);

// Export/Import routes
router.get('/data/export', tenantController.exportTenants);
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
router.post('/data/import', upload.single('file'), tenantController.importTenants);

module.exports = router;
