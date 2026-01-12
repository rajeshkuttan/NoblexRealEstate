const app = require('./app');
const { testConnection } = require('./config/database');

// Import cron services to start them (temporarily disabled)
// const standingOrderService = require('./services/standingOrderService');
// const exchangeRateService = require('./services/exchangeRateService');
// const paymentReminderService = require('./services/paymentReminderService');
// const creditManagementService = require('./services/creditManagementService');

const PORT = process.env.PORT || 5002;

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    console.log('✅ Database connection established');

    // Start cron jobs (temporarily disabled)
    // console.log('🔄 Starting cron jobs...');
    // standingOrderService.scheduleStandingOrderProcessing();
    // exchangeRateService.scheduleExchangeRateUpdates();
    // paymentReminderService.schedulePaymentReminderProcessing();
    // creditManagementService.scheduleCreditReview();
    // console.log('✅ All cron jobs started');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 API available at http://localhost:${PORT}/api`);
      console.log(`✅ Core backend services active`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});
