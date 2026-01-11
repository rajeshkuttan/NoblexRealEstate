/**
 * Payment Gateway Factory
 * Returns the appropriate gateway service based on gateway type
 */

const StripeService = require('./stripeService');
const PayTabsService = require('./paytabsService');
const NetworkService = require('./networkService');

class PaymentGatewayFactory {
  /**
   * Get gateway service instance
   * @param {string} gateway - Gateway type (stripe, paytabs, network)
   * @param {Object} config - Gateway configuration
   * @returns {BaseGatewayService} Gateway service instance
   */
  static getGateway(gateway, config = {}) {
    switch (gateway.toLowerCase()) {
      case 'stripe':
        return new StripeService(config);
      
      case 'paytabs':
        return new PayTabsService(config);
      
      case 'network':
        return new NetworkService(config);
      
      default:
        throw new Error(`Unsupported payment gateway: ${gateway}`);
    }
  }

  /**
   * Get all available gateways
   * @returns {Array<string>} List of gateway names
   */
  static getAvailableGateways() {
    const gateways = [];
    
    if (process.env.STRIPE_SECRET_KEY) {
      gateways.push('stripe');
    }
    
    if (process.env.PAYTABS_SERVER_KEY) {
      gateways.push('paytabs');
    }
    
    if (process.env.NETWORK_API_KEY) {
      gateways.push('network');
    }
    
    return gateways;
  }

  /**
   * Check if gateway is configured
   * @param {string} gateway - Gateway type
   * @returns {boolean} Gateway is configured
   */
  static isGatewayConfigured(gateway) {
    const configMap = {
      'stripe': !!process.env.STRIPE_SECRET_KEY,
      'paytabs': !!process.env.PAYTABS_SERVER_KEY,
      'network': !!process.env.NETWORK_API_KEY
    };
    
    return configMap[gateway.toLowerCase()] || false;
  }
}

module.exports = PaymentGatewayFactory;
