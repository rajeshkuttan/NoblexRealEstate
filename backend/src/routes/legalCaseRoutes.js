const express = require('express');
const router = express.Router();
const legalCaseController = require('../controllers/legalCaseController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { check } = require('express-validator');

// Validation rules
const legalCaseValidation = [
  check('leaseId', 'Lease ID is required').notEmpty(),
  check('tenantId', 'Tenant ID is required').notEmpty(),
  check('unitId', 'Unit ID is required').notEmpty(),
  check('description', 'Description is required').notEmpty(),
  check('startDate', 'Start Date is required').notEmpty()
];

router.use(authMiddleware);

router.get('/', legalCaseController.getAllLegalCases);
router.get('/:id', legalCaseController.getLegalCaseById);
router.post('/', legalCaseValidation, legalCaseController.createLegalCase);
router.put('/:id', legalCaseController.updateLegalCase);
router.delete('/:id', legalCaseController.deleteLegalCase);

router.post('/:id/approve', legalCaseController.approveLegalCase);
router.post('/:id/close', legalCaseController.closeLegalCase);

module.exports = router;
