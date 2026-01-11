const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Ticket routes
router.get('/', ticketController.getAllTickets);
router.get('/stats', ticketController.getTicketStats);
router.get('/priority/:priority', ticketController.getTicketsByPriority);
router.get('/:id', ticketController.getTicketById);
router.post('/', ticketController.createTicket);
router.put('/:id', ticketController.updateTicket);
router.delete('/:id', ticketController.deleteTicket);

module.exports = router;
