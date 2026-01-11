const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout
} = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateUser } = require('../middleware/validation');

// Public routes
router.post('/register', validateUser, register);
router.post('/login', login);

// Protected routes
router.use(authenticateToken); // All routes below require authentication

router.get('/me', getMe);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.post('/logout', logout);

module.exports = router;
