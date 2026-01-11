const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Lead validation rules
const validateLead = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  
  body('company')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Company name must be less than 255 characters'),
  
  body('position')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Position must be less than 255 characters'),
  
  body('emiratesId')
    .optional()
    .isLength({ min: 15, max: 18 })
    .withMessage('Emirates ID must be between 15 and 18 characters'),
  
  body('visaStatus')
    .optional()
    .isIn(['resident', 'tourist', 'investor', 'student', 'other'])
    .withMessage('Invalid visa status'),
  
  body('nationality')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Nationality must be less than 100 characters'),
  
  body('emirate')
    .optional()
    .isIn(['dubai', 'abu_dhabi', 'sharjah', 'ajman', 'ras_al_khaimah', 'fujairah', 'umm_al_quwain'])
    .withMessage('Invalid emirate'),
  
  body('buildingType')
    .optional()
    .isIn(['apartment', 'villa', 'townhouse', 'penthouse', 'duplex', 'studio', 'office', 'retail', 'warehouse'])
    .withMessage('Invalid building type'),
  
  body('furnished')
    .optional()
    .isIn(['furnished', 'semi_furnished', 'unfurnished'])
    .withMessage('Invalid furnished status'),
  
  body('bedrooms')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Bedrooms must be between 0 and 20'),
  
  body('bathrooms')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Bathrooms must be between 0 and 20'),
  
  body('area')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Area must be a positive number'),
  
  body('budget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget must be a positive number'),
  
  body('status')
    .optional()
    .isIn(['new', 'contacted', 'qualified', 'viewing', 'negotiation', 'proposal', 'closed_won', 'closed_lost'])
    .withMessage('Invalid status'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid priority'),
  
  body('source')
    .optional()
    .isIn(['website', 'referral', 'walk_in', 'social_media', 'advertisement', 'other'])
    .withMessage('Invalid source'),
  
  body('leadScore')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Lead score must be between 0 and 100'),
  
  body('assignedTo')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Assigned user ID must be a positive integer'),
  
  body('complianceStatus')
    .optional()
    .isIn(['pending', 'verified', 'rejected', 'under_review'])
    .withMessage('Invalid compliance status'),
  
  body('kycStatus')
    .optional()
    .isIn(['pending', 'completed', 'failed'])
    .withMessage('Invalid KYC status'),
  
  body('antiMoneyLaundering')
    .optional()
    .isBoolean()
    .withMessage('Anti-money laundering must be a boolean'),
  
  body('salaryCertificate')
    .optional()
    .isBoolean()
    .withMessage('Salary certificate must be a boolean'),
  
  body('moveInDate')
    .optional()
    .isISO8601()
    .withMessage('Move-in date must be a valid date'),
  
  body('lastContactDate')
    .optional()
    .isISO8601()
    .withMessage('Last contact date must be a valid date'),
  
  body('nextFollowUp')
    .optional()
    .isISO8601()
    .withMessage('Next follow-up must be a valid date'),
  
  body('requirements')
    .optional()
    .isString()
    .withMessage('Requirements must be a string'),
  
  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('documents')
    .optional()
    .isArray()
    .withMessage('Documents must be an array'),
  
  handleValidationErrors
];

// Property validation rules
const validateProperty = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Title must be between 2 and 255 characters'),
  
  body('location')
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ max: 255 })
    .withMessage('Location must be less than 255 characters'),
  
  body('emirate')
    .optional()
    .isIn(['dubai', 'abu_dhabi', 'sharjah', 'ajman', 'ras_al_khaimah', 'fujairah', 'umm_al_quwain'])
    .withMessage('Invalid emirate'),
  
  body('buildingType')
    .optional()
    .isIn(['apartment', 'villa', 'townhouse', 'penthouse', 'duplex', 'studio', 'office', 'retail', 'warehouse'])
    .withMessage('Invalid building type'),
  
  body('furnished')
    .optional()
    .isIn(['furnished', 'semi_furnished', 'unfurnished'])
    .withMessage('Invalid furnished status'),
  
  body('bedrooms')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Bedrooms must be between 0 and 20'),
  
  body('bathrooms')
    .optional()
    .isInt({ min: 0, max: 20 })
    .withMessage('Bathrooms must be between 0 and 20'),
  
  body('area')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Area must be a positive number'),
  
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  body('pricePerSqft')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price per sqft must be a positive number'),
  
  body('availability')
    .optional()
    .isIn(['available', 'rented', 'sold', 'maintenance'])
    .withMessage('Invalid availability status'),
  
  body('agentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Agent ID must be a positive integer'),
  
  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),
  
  body('features')
    .optional()
    .isObject()
    .withMessage('Features must be an object'),
  
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
  
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
  
  body('moveInDate')
    .optional()
    .isISO8601()
    .withMessage('Move-in date must be a valid date'),
  
  handleValidationErrors
];

// User validation rules
const validateUser = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('role')
    .optional()
    .isIn(['admin', 'agent', 'manager'])
    .withMessage('Invalid role'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
  
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  
  handleValidationErrors
];

// ID parameter validation
const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  handleValidationErrors
];

// Query validation
const validateQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sortBy')
    .optional()
    .isIn(['created_at', 'updated_at', 'name', 'email', 'status', 'priority', 'lead_score'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  handleValidationErrors
];

module.exports = {
  validateLead,
  validateProperty,
  validateUser,
  validateId,
  validateQuery,
  handleValidationErrors
};
