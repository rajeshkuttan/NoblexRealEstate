/**
 * Payment Gateway Routes
 */

const express = require('express');
const router = express.Router();
const paymentGatewayController = require('../controllers/paymentGatewayController');
const { authenticateToken } = require('../middleware/auth');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');

router.use(authenticateToken);
router.use(resolveCompanyContext);


// Get available gateways
router.get('/available', paymentGatewayController.getAvailableGateways);

// Create payment intent
router.post('/create-intent', paymentGatewayController.createPaymentIntent);

// Get payment status
router.get('/transactions/:id', paymentGatewayController.getPaymentStatus);

// Process refund
router.post('/transactions/:id/refund', paymentGatewayController.processRefund);

// Get transaction history
router.get('/transactions', paymentGatewayController.getTransactionHistory);

// Webhooks (no authentication for webhooks)
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), paymentGatewayController.handleStripeWebhook);
router.post('/paytabs/webhook', paymentGatewayController.handlePayTabsWebhook);
router.post('/network/webhook', paymentGatewayController.handleNetworkWebhook);

module.exports = router;
