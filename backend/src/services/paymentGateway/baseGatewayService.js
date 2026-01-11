/**
 * Base Payment Gateway Service
 * Abstract interface for payment gateway implementations
 */

class BaseGatewayService {
  constructor(config) {
    this.config = config;
  }

  /**
   * Create a payment intent
   * @param {Object} paymentData - Payment details
   * @returns {Promise<Object>} Payment intent object
   */
  async createPaymentIntent(paymentData) {
    throw new Error('createPaymentIntent must be implemented by subclass');
  }

  /**
   * Retrieve payment status
   * @param {string} transactionId - Gateway transaction ID
   * @returns {Promise<Object>} Payment status
   */
  async getPaymentStatus(transactionId) {
    throw new Error('getPaymentStatus must be implemented by subclass');
  }

  /**
   * Process refund
   * @param {string} transactionId - Original transaction ID
   * @param {number} amount - Refund amount
   * @returns {Promise<Object>} Refund result
   */
  async refundPayment(transactionId, amount) {
    throw new Error('refundPayment must be implemented by subclass');
  }

  /**
   * Verify webhook signature
   * @param {Object} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {boolean} Signature valid
   */
  verifyWebhookSignature(payload, signature) {
    throw new Error('verifyWebhookSignature must be implemented by subclass');
  }

  /**
   * Parse webhook event
   * @param {Object} payload - Webhook payload
   * @returns {Object} Normalized event data
   */
  parseWebhookEvent(payload) {
    throw new Error('parseWebhookEvent must be implemented by subclass');
  }

  /**
   * Get supported payment methods
   * @returns {Array<string>} Supported payment methods
   */
  getSupportedMethods() {
    return ['card'];
  }

  /**
   * Get gateway name
   * @returns {string} Gateway identifier
   */
  getGatewayName() {
    throw new Error('getGatewayName must be implemented by subclass');
  }
}

module.exports = BaseGatewayService;
