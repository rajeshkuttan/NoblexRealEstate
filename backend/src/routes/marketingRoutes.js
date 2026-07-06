const express = require('express');
const { body } = require('express-validator');
const {
  getPublicListings,
  submitInquiry,
} = require('../controllers/marketingController');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

const validateInquiry = [
  body('name').notEmpty().withMessage('Name is required').isLength({ min: 2, max: 255 }),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('message').optional().isLength({ max: 2000 }),
  body('unitId').optional().isInt({ min: 1 }),
  handleValidationErrors,
];

router.get('/listings', getPublicListings);
router.post('/inquiries', validateInquiry, submitInquiry);

module.exports = router;
