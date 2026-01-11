/**
 * Stripe Payment Gateway Service
 * Handles Stripe payment processing
 */

const BaseGatewayService = require('./baseGatewayService');
const stripe = require('stripe');

class StripeService extends BaseGatewayService {
  constructor(config = {}) {
    super(config);
    this.stripeClient = stripe(config.secretKey || process.env.STRIPE_SECRET_KEY);
    this.webhookSecret = config.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(paymentData) {
    try {
      const {
        amount,
        currency = 'AED',
        tenantEmail,
        tenantName,
        description,
        metadata = {}
      } = paymentData;

      const paymentIntent = await this.stripeClient.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        automatic_payment_methods: {
          enabled: true
        },
        receipt_email: tenantEmail,
        description: description || 'Rent Payment',
        metadata: {
          ...metadata,
          tenant_name: tenantName,
          integration: 'emirates_lease_flow'
        }
      });

      return {
        success: true,
        transactionId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        metadata: paymentIntent.metadata
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  /**
   * Retrieve payment status
   */
  async getPaymentStatus(transactionId) {
    try {
      const paymentIntent = await this.stripeClient.paymentIntents.retrieve(transactionId);

      return {
        success: true,
        transactionId: paymentIntent.id,
        status: this.mapStripeStatus(paymentIntent.status),
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
        paymentMethod: paymentIntent.payment_method,
        cardLast4: paymentIntent.charges?.data[0]?.payment_method_details?.card?.last4,
        cardBrand: paymentIntent.charges?.data[0]?.payment_method_details?.card?.brand,
        receiptUrl: paymentIntent.charges?.data[0]?.receipt_url,
        metadata: paymentIntent.metadata
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process refund
   */
  async refundPayment(transactionId, amount = null) {
    try {
      const refundData = {
        payment_intent: transactionId
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await this.stripeClient.refunds.create(refundData);

      return {
        success: true,
        refundId: refund.id,
        status: refund.status,
        amount: refund.amount / 100,
        currency: refund.currency.toUpperCase()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    try {
      const event = this.stripeClient.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );
      return { valid: true, event };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Parse webhook event
   */
  parseWebhookEvent(stripeEvent) {
    const eventType = stripeEvent.type;
    const paymentIntent = stripeEvent.data.object;

    return {
      eventType: this.mapWebhookEvent(eventType),
      transactionId: paymentIntent.id,
      status: this.mapStripeStatus(paymentIntent.status),
      amount: paymentIntent.amount ? paymentIntent.amount / 100 : 0,
      currency: paymentIntent.currency ? paymentIntent.currency.toUpperCase() : 'AED',
      metadata: paymentIntent.metadata || {},
      rawEvent: stripeEvent
    };
  }

  /**
   * Map Stripe status to internal status
   */
  mapStripeStatus(stripeStatus) {
    const statusMap = {
      'requires_payment_method': 'pending',
      'requires_confirmation': 'pending',
      'requires_action': 'processing',
      'processing': 'processing',
      'requires_capture': 'processing',
      'canceled': 'cancelled',
      'succeeded': 'succeeded'
    };

    return statusMap[stripeStatus] || 'pending';
  }

  /**
   * Map webhook events to internal events
   */
  mapWebhookEvent(stripeEvent) {
    const eventMap = {
      'payment_intent.succeeded': 'payment_succeeded',
      'payment_intent.payment_failed': 'payment_failed',
      'payment_intent.canceled': 'payment_cancelled',
      'charge.refunded': 'payment_refunded'
    };

    return eventMap[stripeEvent] || 'unknown';
  }

  /**
   * Get supported payment methods
   */
  getSupportedMethods() {
    return ['card', 'apple_pay', 'google_pay'];
  }

  /**
   * Get gateway name
   */
  getGatewayName() {
    return 'stripe';
  }
}

module.exports = StripeService;
