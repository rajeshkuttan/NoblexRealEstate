/**
 * PayTabs Payment Gateway Service
 * Handles PayTabs payment processing (MENA region)
 */

const BaseGatewayService = require('./baseGatewayService');
const axios = require('axios');

class PayTabsService extends BaseGatewayService {
  constructor(config = {}) {
    super(config);
    this.profileId = config.profileId || process.env.PAYTABS_PROFILE_ID;
    this.serverKey = config.serverKey || process.env.PAYTABS_SERVER_KEY;
    this.baseUrl = config.baseUrl || process.env.PAYTABS_BASE_URL || 'https://secure.paytabs.com';
  }

  /**
   * Create a payment intent/page
   */
  async createPaymentIntent(paymentData) {
    try {
      const {
        amount,
        currency = 'AED',
        tenantEmail,
        tenantName,
        tenantPhone,
        description,
        metadata = {},
        returnUrl,
        callbackUrl
      } = paymentData;

      const response = await axios.post(
        `${this.baseUrl}/payment/request`,
        {
          profile_id: this.profileId,
          tran_type: 'sale',
          tran_class: 'ecom',
          cart_id: metadata.paymentNumber || `PAYMENT_${Date.now()}`,
          cart_description: description || 'Rent Payment',
          cart_currency: currency,
          cart_amount: parseFloat(amount).toFixed(2),
          callback: callbackUrl || `${process.env.BACKEND_URL}/api/payment-gateway/paytabs/webhook`,
          return: returnUrl || `${process.env.FRONTEND_URL}/payment/success`,
          customer_details: {
            name: tenantName,
            email: tenantEmail,
            phone: tenantPhone || '0000000000',
            street1: 'N/A',
            city: 'Dubai',
            state: 'Dubai',
            country: 'AE',
            zip: '00000'
          },
          hide_shipping: true,
          framed: false
        },
        {
          headers: {
            'Authorization': this.serverKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.redirect_url) {
        return {
          success: true,
          transactionId: response.data.tran_ref,
          paymentUrl: response.data.redirect_url,
          status: 'pending',
          amount: parseFloat(amount),
          currency: currency
        };
      } else {
        return {
          success: false,
          error: response.data?.message || 'Failed to create payment'
        };
      }
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
      const response = await axios.post(
        `${this.baseUrl}/payment/query`,
        {
          profile_id: this.profileId,
          tran_ref: transactionId
        },
        {
          headers: {
            'Authorization': this.serverKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data;

      return {
        success: true,
        transactionId: data.tran_ref,
        status: this.mapPayTabsStatus(data.payment_result?.response_status),
        amount: parseFloat(data.cart_amount),
        currency: data.cart_currency,
        paymentMethod: data.payment_info?.payment_method,
        cardLast4: data.payment_info?.card_last_four,
        cardBrand: data.payment_info?.card_scheme,
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
      const response = await axios.post(
        `${this.baseUrl}/payment/request`,
        {
          profile_id: this.profileId,
          tran_type: 'refund',
          tran_class: 'ecom',
          tran_ref: transactionId,
          cart_id: `REFUND_${Date.now()}`,
          cart_description: 'Refund',
          cart_currency: 'AED',
          cart_amount: amount ? parseFloat(amount).toFixed(2) : undefined
        },
        {
          headers: {
            'Authorization': this.serverKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = response.data;

      return {
        success: data.payment_result?.response_status === 'A',
        refundId: data.tran_ref,
        status: this.mapPayTabsStatus(data.payment_result?.response_status),
        amount: parseFloat(data.cart_amount),
        currency: data.cart_currency
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
    // PayTabs uses server key validation
    // The signature should match the server key
    return {
      valid: signature === this.serverKey,
      event: payload
    };
  }

  /**
   * Parse webhook event
   */
  parseWebhookEvent(payload) {
    return {
      eventType: this.mapWebhookEvent(payload.payment_result?.response_status),
      transactionId: payload.tran_ref,
      status: this.mapPayTabsStatus(payload.payment_result?.response_status),
      amount: parseFloat(payload.cart_amount || 0),
      currency: payload.cart_currency || 'AED',
      metadata: {
        cartId: payload.cart_id,
        cardLast4: payload.payment_info?.card_last_four,
        cardBrand: payload.payment_info?.card_scheme
      },
      rawEvent: payload
    };
  }

  /**
   * Map PayTabs status to internal status
   */
  mapPayTabsStatus(paytabsStatus) {
    const statusMap = {
      'A': 'succeeded', // Authorized/Approved
      'H': 'processing', // Hold
      'P': 'pending', // Pending
      'V': 'failed', // Void
      'E': 'failed', // Error
      'D': 'cancelled', // Declined
      'X': 'cancelled' // Cancelled
    };

    return statusMap[paytabsStatus] || 'pending';
  }

  /**
   * Map webhook events to internal events
   */
  mapWebhookEvent(paytabsStatus) {
    if (paytabsStatus === 'A') return 'payment_succeeded';
    if (['D', 'E', 'V'].includes(paytabsStatus)) return 'payment_failed';
    if (paytabsStatus === 'X') return 'payment_cancelled';
    return 'unknown';
  }

  /**
   * Get supported payment methods
   */
  getSupportedMethods() {
    return ['card', 'mada', 'apple_pay'];
  }

  /**
   * Get gateway name
   */
  getGatewayName() {
    return 'paytabs';
  }
}

module.exports = PayTabsService;
