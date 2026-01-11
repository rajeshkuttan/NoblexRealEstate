/**
 * Payment Gateway Controller
 * Handles payment gateway operations
 */

const { PaymentGatewayTransaction, Payment, Tenant, Lease } = require('../models');
const PaymentGatewayFactory = require('../services/paymentGateway');

/**
 * Create payment intent
 */
exports.createPaymentIntent = async (req, res) => {
  try {
    const {
      gateway,
      amount,
      currency = 'AED',
      tenantId,
      leaseId,
      description,
      returnUrl,
      callbackUrl
    } = req.body;

    // Validate gateway
    if (!PaymentGatewayFactory.isGatewayConfigured(gateway)) {
      return res.status(400).json({
        success: false,
        message: `Payment gateway ${gateway} is not configured`
      });
    }

    // Get tenant details
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    // Get lease details if provided
    let lease = null;
    if (leaseId) {
      lease = await Lease.findByPk(leaseId);
    }

    // Initialize gateway
    const gatewayService = PaymentGatewayFactory.getGateway(gateway);

    // Create payment intent
    const result = await gatewayService.createPaymentIntent({
      amount,
      currency,
      tenantEmail: tenant.email,
      tenantName: tenant.name,
      tenantPhone: tenant.mobile,
      description: description || `Rent payment for ${tenant.name}`,
      metadata: {
        tenantId,
        leaseId: leaseId || null,
        propertyId: lease?.propertyId || null
      },
      returnUrl,
      callbackUrl
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Failed to create payment intent'
      });
    }

    // Create gateway transaction record
    const gatewayTransaction = await PaymentGatewayTransaction.create({
      gateway,
      transactionId: result.transactionId,
      tenantId,
      leaseId: leaseId || null,
      amount,
      currency,
      status: result.status || 'pending',
      customerEmail: tenant.email,
      metadata: {
        description,
        returnUrl,
        orderReference: result.orderReference
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: gatewayTransaction.id,
        transactionId: result.transactionId,
        clientSecret: result.clientSecret,
        paymentUrl: result.paymentUrl,
        status: result.status,
        gateway,
        amount,
        currency
      }
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
};

/**
 * Get payment status
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const gatewayTransaction = await PaymentGatewayTransaction.findByPk(id, {
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Payment,
          as: 'payment',
          attributes: ['id', 'paymentNumber', 'amount', 'status']
        }
      ]
    });

    if (!gatewayTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Get latest status from gateway
    const gatewayService = PaymentGatewayFactory.getGateway(gatewayTransaction.gateway);
    const statusResult = await gatewayService.getPaymentStatus(gatewayTransaction.transactionId);

    if (statusResult.success) {
      // Update transaction record
      await gatewayTransaction.update({
        status: statusResult.status,
        paymentMethod: statusResult.cardBrand,
        cardLast4: statusResult.cardLast4,
        receiptUrl: statusResult.receiptUrl
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...gatewayTransaction.toJSON(),
        latestStatus: statusResult.status,
        gatewayData: statusResult
      }
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: error.message
    });
  }
};

/**
 * Process refund
 */
exports.processRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const gatewayTransaction = await PaymentGatewayTransaction.findByPk(id);

    if (!gatewayTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (gatewayTransaction.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Can only refund succeeded transactions'
      });
    }

    // Process refund
    const gatewayService = PaymentGatewayFactory.getGateway(gatewayTransaction.gateway);
    const refundResult = await gatewayService.refundPayment(
      gatewayTransaction.transactionId,
      amount || null
    );

    if (!refundResult.success) {
      return res.status(400).json({
        success: false,
        message: refundResult.error || 'Failed to process refund'
      });
    }

    // Update transaction
    await gatewayTransaction.update({
      status: 'refunded',
      refundAmount: refundResult.amount,
      refundedAt: new Date(),
      metadata: {
        ...gatewayTransaction.metadata,
        refundReason: reason,
        refundId: refundResult.refundId
      }
    });

    // Update linked payment if exists
    if (gatewayTransaction.paymentId) {
      const payment = await Payment.findByPk(gatewayTransaction.paymentId);
      if (payment) {
        await payment.update({
          status: 'refunded'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refundId: refundResult.refundId,
        amount: refundResult.amount,
        currency: refundResult.currency,
        status: refundResult.status
      }
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  }
};

/**
 * Handle Stripe webhook
 */
exports.handleStripeWebhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const payload = req.body;

    const gatewayService = PaymentGatewayFactory.getGateway('stripe');
    const verification = gatewayService.verifyWebhookSignature(payload, signature);

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    const eventData = gatewayService.parseWebhookEvent(verification.event);
    await processWebhookEvent('stripe', eventData);

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
};

/**
 * Handle PayTabs webhook
 */
exports.handlePayTabsWebhook = async (req, res) => {
  try {
    const signature = req.headers['authorization'];
    const payload = req.body;

    const gatewayService = PaymentGatewayFactory.getGateway('paytabs');
    const verification = gatewayService.verifyWebhookSignature(payload, signature);

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    const eventData = gatewayService.parseWebhookEvent(payload);
    await processWebhookEvent('paytabs', eventData);

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('PayTabs webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
};

/**
 * Handle Network webhook
 */
exports.handleNetworkWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-network-signature'];
    const payload = req.body;

    const gatewayService = PaymentGatewayFactory.getGateway('network');
    const verification = gatewayService.verifyWebhookSignature(payload, signature);

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    const eventData = gatewayService.parseWebhookEvent(payload);
    await processWebhookEvent('network', eventData);

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Network webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
};

/**
 * Process webhook event
 */
async function processWebhookEvent(gateway, eventData) {
  const transaction = await PaymentGatewayTransaction.findOne({
    where: {
      gateway,
      transactionId: eventData.transactionId
    }
  });

  if (!transaction) {
    console.log(`Transaction not found for webhook: ${eventData.transactionId}`);
    return;
  }

  // Update transaction status
  await transaction.update({
    status: eventData.status,
    webhookReceived: true,
    webhookData: eventData.rawEvent,
    paymentMethod: eventData.metadata?.cardBrand,
    cardLast4: eventData.metadata?.cardLast4
  });

  // If payment succeeded, create payment record
  if (eventData.eventType === 'payment_succeeded' && !transaction.paymentId) {
    const lease = await Lease.findByPk(transaction.leaseId);
    
    const payment = await Payment.create({
      paymentNumber: `PAY-${Date.now()}`,
      leaseId: transaction.leaseId,
      tenantId: transaction.tenantId,
      amount: transaction.amount,
      paymentDate: new Date(),
      dueDate: new Date(),
      paymentMethod: 'online',
      status: 'paid',
      reference: transaction.transactionId,
      description: `Online payment via ${gateway}`,
      receiptNumber: `REC-${Date.now()}`,
      bankDetails: {
        gateway,
        transactionId: transaction.transactionId,
        cardLast4: transaction.cardLast4,
        cardBrand: transaction.paymentMethod
      }
    });

    await transaction.update({ paymentId: payment.id });
  }
}

/**
 * Get available gateways
 */
exports.getAvailableGateways = async (req, res) => {
  try {
    const gateways = PaymentGatewayFactory.getAvailableGateways();
    
    res.status(200).json({
      success: true,
      data: gateways.map(gateway => ({
        name: gateway,
        configured: true,
        methods: PaymentGatewayFactory.getGateway(gateway).getSupportedMethods()
      }))
    });
  } catch (error) {
    console.error('Get available gateways error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available gateways',
      error: error.message
    });
  }
};

/**
 * Get transaction history
 */
exports.getTransactionHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      gateway,
      status,
      tenantId,
      startDate,
      endDate
    } = req.query;

    const whereClause = { isActive: true };
    
    if (gateway) whereClause.gateway = gateway;
    if (status) whereClause.status = status;
    if (tenantId) whereClause.tenantId = tenantId;
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const { count, rows: transactions } = await PaymentGatewayTransaction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'email', 'mobile']
        },
        {
          model: Payment,
          as: 'payment',
          attributes: ['id', 'paymentNumber', 'status']
        }
      ],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction history',
      error: error.message
    });
  }
};
