const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/servicesController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get services by entity (unit or lease)
router.get('/', servicesController.getServicesByEntity);

// Get a single service by ID
router.get('/:id', servicesController.getServiceById);

// Create a new service
router.post('/', servicesController.createService);

// Bulk create services
router.post('/bulk', servicesController.bulkCreateServices);

// Copy services from unit to lease
router.post('/copy-to-lease', servicesController.copyUnitServicesToLease);

// Update a service
router.put('/:id', servicesController.updateService);

// Delete a service (soft delete by default, hard delete with ?hard=true)
router.delete('/:id', servicesController.deleteService);

module.exports = router;
