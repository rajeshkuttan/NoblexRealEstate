const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Import configurations
const config = require('./config/config');
const { testConnection, syncDatabase } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const standingOrderService = require('./services/standingOrderService');
const exchangeRateService = require('./services/exchangeRateService');
const paymentReminderService = require('./services/paymentReminderService');
const creditManagementService = require('./services/creditManagementService');

// Import routes
const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const propertyRoutes = require('./routes/properties');
const tenantRoutes = require('./routes/tenantRoutes');
const unitRoutes = require('./routes/unitRoutes');
const leaseRoutes = require('./routes/leaseRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const chartOfAccountRoutes = require('./routes/chartOfAccountRoutes');
const financialTransactionRoutes = require('./routes/financialTransactionRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const journalVoucherRoutes = require('./routes/journalVoucherRoutes');
const systemSettingRoutes = require('./routes/systemSettingRoutes');
const companySettingRoutes = require('./routes/companySettingRoutes');
const taxSettingRoutes = require('./routes/taxSettingRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const vendorInvoiceRoutes = require('./routes/vendorInvoiceRoutes');
const bankAccountRoutes = require('./routes/bankAccountRoutes');
const bankTransactionRoutes = require('./routes/bankTransactionRoutes');
const reconciliationRoutes = require('./routes/reconciliationRoutes');
const financialForecastRoutes = require('./routes/financialForecastRoutes');
const exchangeRateRoutes = require('./routes/exchangeRateRoutes');
const financialReportsRoutes = require('./routes/financialReportsRoutes');
const customReportsRoutes = require('./routes/customReportsRoutes');
const documentRoutes = require('./routes/documentRoutes');
const reportShareRoutes = require('./routes/reportShareRoutes');
const paymentGatewayRoutes = require('./routes/paymentGatewayRoutes');
const standingOrderRoutes = require('./routes/standingOrderRoutes');
const chequeRoutes = require('./routes/chequeRoutes');
const securityDepositRoutes = require('./routes/securityDepositRoutes');
const paymentReminderRoutes = require('./routes/paymentReminderRoutes');
const pettyCashRoutes = require('./routes/pettyCashRoutes');
const creditLimitRoutes = require('./routes/creditLimitRoutes');
const bankStatementRoutes = require('./routes/bankStatementRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const treasuryReportsRoutes = require('./routes/treasuryReportsRoutes');
const settingsRoutes = require('./routes/settings');
const servicesRoutes = require('./routes/services');
const serviceTemplatesRoutes = require('./routes/serviceTemplates');
const dashboardRoutes = require('./routes/dashboard');
const legalCaseRoutes = require('./routes/legalCaseRoutes');
// Procurement Module Routes
const itemRoutes = require('./routes/itemRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const goodsReceiptRoutes = require('./routes/goodsReceiptRoutes');
const purchaseInvoiceRoutes = require('./routes/purchaseInvoiceRoutes');
const ledgerSetupRoutes = require('./routes/ledgerSetupRoutes');
const userRoutes = require('./routes/userRoutes');
const documentNumberingRoutes = require('./routes/documentNumberingRoutes');

// Create Express app
const app = express();

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Security middleware
app.use(helmet());

// CORS configuration - Support multiple origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in the allowed list
    if (config.cors.origin.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // Cache preflight requests for 10 minutes
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Logging middleware
app.use(morgan('combined', {
  stream: fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' })
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Emirates Lease Flow API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/leases', leaseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/chart-of-accounts', chartOfAccountRoutes);
app.use('/api/financial-transactions', financialTransactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/journal-vouchers', journalVoucherRoutes);
app.use('/api/system-settings', systemSettingRoutes);
app.use('/api/company-settings', companySettingRoutes);
app.use('/api/tax-settings', taxSettingRoutes);
// Finance Module - Phase 3 (Complete)
app.use('/api/vendors', vendorRoutes);
app.use('/api/vendor-invoices', vendorInvoiceRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/bank-transactions', bankTransactionRoutes);
app.use('/api/reconciliations', reconciliationRoutes);
app.use('/api/financial-forecasts', financialForecastRoutes);
app.use('/api/exchange-rates', exchangeRateRoutes);
app.use('/api/finance/reports', financialReportsRoutes);
app.use('/api/custom-reports', customReportsRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/reports', reportShareRoutes);
app.use('/api/payment-gateway', paymentGatewayRoutes);
app.use('/api/standing-orders', standingOrderRoutes);
app.use('/api/cheques', chequeRoutes);
app.use('/api/security-deposits', securityDepositRoutes);
app.use('/api/payment-reminders', paymentReminderRoutes);
app.use('/api/petty-cash', pettyCashRoutes);
app.use('/api/credit-limits', creditLimitRoutes);
app.use('/api/bank-statements', bankStatementRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/treasury-reports', treasuryReportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/service-templates', serviceTemplatesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/legal-cases', legalCaseRoutes);
// Procurement Module Routes
app.use('/api/items', itemRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/goods-receipts', goodsReceiptRoutes);
app.use('/api/purchase-invoices', purchaseInvoiceRoutes);
app.use('/api/ledger-setups', ledgerSetupRoutes);
app.use('/api/document-numbering', documentNumberingRoutes);

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Database connection and server startup
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Sync database (create tables if they don't exist)
    const dbSynced = await syncDatabase();
    if (!dbSynced) {
      console.error('❌ Failed to sync database. Exiting...');
      process.exit(1);
    }

    // Start server
    const PORT = config.port;
    app.listen(PORT, () => {
      console.log(`🚀 Emirates Lease Flow API server running on port ${PORT}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
      
      // Start standing order scheduler
      standingOrderService.startScheduler();
      
      // Start exchange rate scheduler
      exchangeRateService.startScheduler();
      
      // Start payment reminder scheduler
      paymentReminderService.startScheduler();
      
      // Start credit management scheduler
      creditManagementService.startScheduler();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Don't start the server here - server.js will handle it
// startServer();

module.exports = app;

