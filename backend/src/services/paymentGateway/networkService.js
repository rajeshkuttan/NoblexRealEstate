/**
 * Network International Payment Gateway Service
 * Handles Network International payment processing (UAE/MENA)
 */

const BaseGatewayService = require('./baseGatewayService');
const axios = require('axios');
const crypto = require('crypto');

class NetworkService extends BaseGatewayService {
  constructor(config = {}) {
    super(config);
    this.outletId = config.outletId || process.env.NETWORK_OUTLET_ID;
    this.apiKey = config.apiKey || process.env.NETWORK_API_KEY;
    this.secretKey = config.secretKey || process.env.NETWORK_SECRET_KEY;
    this.baseUrl = config.baseUrl || process.env.NETWORK_BASE_URL || 'https://api-gateway.network.ae';
  }

  /**
   * Create a payment session
   */
  async createPaymentIntent(paymentData) {
    try {
      const {
        amount,
        currency = 'AED',
        tenantEmail,
        tenantName,
        description,
        metadata = {},
        returnUrl
      } = paymentData;

      const orderReference = metadata.paymentNumber || `ORDER_${Date.now()}`;

      const requestData = {
        action: 'SALE',
        amount: {
          currencyCode: currency,
          value: Math.round(amount * 100) // Convert to minor units
        },
        merchantAttributes: {
          redirectUrl: returnUrl || `${process.env.FRONTEND_URL}/payment/success`,
          cancelUrl: `${process.env.FRONTEND_URL}/payment/cancel`,
          skipConfirmationPage: false
        },
        emailAddress: tenantEmail,
        billingAddress: {
          firstName: tenantName?.split(' ')[0] || 'Customer',
          lastName: tenantName?.split(' ').slice(1).join(' ') || 'N/A',
          address1: 'N/A',
          city: 'Dubai',
          countryCode: 'AE'
        },
        order: {
          reference: orderReference,
          description: description || 'Rent Payment'
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/transactions/outlets/${this.outletId}/orders`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data;

      return {
        success: true,
        transactionId: data.reference,
        paymentUrl: data._links?.payment?.href,
        status: 'pending',
        amount: parseFloat(amount),
        currency: currency,
        orderReference: orderReference
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Retrieve payment status
   */
  async getPaymentStatus(transactionId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transactions/outlets/${this.outletId}/orders/${transactionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data;

      return {
        success: true,
        transactionId: data.reference,
        status: this.mapNetworkStatus(data.state),
        amount: data.amount?.value ? data.amount.value / 100 : 0,
        currency: data.amount?.currencyCode || 'AED',
        paymentMethod: data.paymentMethod?.name,
        cardLast4: data.paymentMethod?.card?.number?.slice(-4),
        cardBrand: data.paymentMethod?.card?.scheme,
        metadata: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Process refund
   */
  async refundPayment(transactionId, amount = null) {
    try {
      const requestData = {
        action: 'REFUND',
        amount: amount ? {
          currencyCode: 'AED',
          value: Math.round(amount * 100)
        } : undefined
      };

      const response = await axios.post(
        `${this.baseUrl}/transactions/outlets/${this.outletId}/orders/${transactionId}/refund`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data;

      return {
        success: data.state === 'REFUNDED',
        refundId: data.reference,
        status: this.mapNetworkStatus(data.state),
        amount: data.amount?.value ? data.amount.value / 100 : 0,
        currency: data.amount?.currencyCode || 'AED'
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    try {
      const computedSignature = crypto
        .createHmac('sha256', this.secretKey)
        .update(JSON.stringify(payload))
        .digest('hex');

      return {
        valid: computedSignature === signature,
        event: payload
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Parse webhook event
   */
  parseWebhookEvent(payload) {
    return {
      eventType: this.mapWebhookEvent(payload.state),
      transactionId: payload.reference,
      status: this.mapNetworkStatus(payload.state),
      amount: payload.amount?.value ? payload.amount.value / 100 : 0,
      currency: payload.amount?.currencyCode || 'AED',
      metadata: {
        orderReference: payload.order?.reference,
        cardLast4: payload.paymentMethod?.card?.number?.slice(-4),
        cardBrand: payload.paymentMethod?.card?.scheme
      },
      rawEvent: payload
    };
  }

  /**
   * Map Network status to internal status
   */
  mapNetworkStatus(networkStatus) {
    const statusMap = {
      'AUTHORISED': 'succeeded',
      'CAPTURED': 'succeeded',
      'PURCHASED': 'succeeded',
      'DECLINED': 'failed',
      'FAILED': 'failed',
      'CANCELLED': 'cancelled',
      'REFUNDED': 'refunded',
      'PARTIALLY_REFUNDED': 'refunded',
      'AWAITING_3DS_AUTHENTICATION': 'processing',
      'STARTED': 'pending'
    };

    return statusMap[networkStatus] || 'pending';
  }

  /**
   * Map webhook events to internal events
   */
  mapWebhookEvent(networkStatus) {
    if (['AUTHORISED', 'CAPTURED', 'PURCHASED'].includes(networkStatus)) {
      return 'payment_succeeded';
    }
    if (['DECLINED', 'FAILED'].includes(networkStatus)) {
      return 'payment_failed';
    }
    if (networkStatus === 'CANCELLED') {
      return 'payment_cancelled';
    }
    if (['REFUNDED', 'PARTIALLY_REFUNDED'].includes(networkStatus)) {
      return 'payment_refunded';
    }
    return 'unknown';
  }

  /**
   * Get supported payment methods
   */
  getSupportedMethods() {
    return ['card', 'apple_pay', 'samsung_pay'];
  }

  /**
   * Get gateway name
   */
  getGatewayName() {
    return 'network';
  }
}

module.exports = NetworkService;
