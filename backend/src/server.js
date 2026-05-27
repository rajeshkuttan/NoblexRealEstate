const app = require('./app');
const { testConnection, syncDatabase } = require('./config/database');
const { scheduleLeaseRentIncreaseNotices } = require('./services/leaseExpiryNoticeService');
const { startIntegrityAuditScheduler } = require('./services/auditScheduler.service');

// Import cron services to start them (temporarily disabled)
// const standingOrderService = require('./services/standingOrderService');
// const exchangeRateService = require('./services/exchangeRateService');
// const paymentReminderService = require('./services/paymentReminderService');
// const creditManagementService = require('./services/creditManagementService');

const PORT = process.env.PORT || 5002;

// Start server
const startServer = async () => {
  try {
    // Test database connection and sync
    await testConnection();
    await syncDatabase();
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
      scheduleLeaseRentIncreaseNotices();
      console.log('✅ Lease rent-increase notice scheduler registered (daily 08:00)');
      startIntegrityAuditScheduler();
      console.log('✅ System integrity audit scheduler registered (daily 02:00)');
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
