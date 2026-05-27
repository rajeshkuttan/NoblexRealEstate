const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');

// Apply authentication middleware to all routes
router.use(authMiddleware);
router.use(resolveCompanyContext);

// Ticket routes
router.get('/', ticketController.getAllTickets);
router.get('/stats', ticketController.getTicketStats);
router.get('/options', ticketController.getTicketOptions);
router.get('/priority/:priority', ticketController.getTicketsByPriority);
router.get('/:id', ticketController.getTicketById);
router.post('/', ticketController.createTicket);
router.put('/:id', ticketController.updateTicket);
router.post('/:id/notes', ticketController.addTicketNote);
router.delete('/:id/notes/:noteId', ticketController.deleteTicketNote);
router.delete('/:id', ticketController.deleteTicket);

module.exports = router;
