const app = require('./app');
const { testConnection, syncDatabase } = require('./config/database');
const { scheduleLeaseRentIncreaseNotices } = require('./services/leaseExpiryNoticeService');
const { startIntegrityAuditScheduler } = require('./services/auditScheduler.service');
const { startInvestmentValuationScheduler } = require('./services/investmentValuationScheduler.service');
const { startPrepaidExpenseScheduler } = require('./services/prepaidExpenses/prepaidScheduler.service');
const { startLeaseRevenueScheduler } = require('./services/leaseRevenue/leaseRevenueScheduler.service');
const { startIndexerWorker, startQueueWorker } = require('./copilot');
const { shouldRunWorkers } = require('./copilot/config/copilotConfig');

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
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Database connection failed. Please ensure your MySQL server is running and configured correctly.');
      process.exit(1);
    }
    
    const isSynced = await syncDatabase();
    if (!isSynced) {
      console.error('❌ Database sync failed.');
      process.exit(1);
    }
    
    console.log('✅ Database connection established');

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 API available at http://localhost:${PORT}/api`);
      console.log(`✅ Core backend services active`);
      scheduleLeaseRentIncreaseNotices();
      console.log('✅ Lease rent-increase notice scheduler registered (daily 08:00)');
      startIntegrityAuditScheduler();
      console.log('✅ System integrity audit scheduler registered (daily 02:00)');
      startInvestmentValuationScheduler();
      startPrepaidExpenseScheduler();
      startLeaseRevenueScheduler();
      if (shouldRunWorkers()) {
        startIndexerWorker();
        void startQueueWorker();
        console.log('✅ Copilot document indexer registered (in-process)');
      } else {
        console.log('ℹ️ Copilot workers skipped (COPILOT_RUN_WORKERS=false — use realestate-copilot-worker)');
      }
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
