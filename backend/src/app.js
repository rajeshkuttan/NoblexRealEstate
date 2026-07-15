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
const { requireModulePermission } = require('./middleware/modulePermissions');
const standingOrderService = require('./services/standingOrderService');
const exchangeRateService = require('./services/exchangeRateService');
const paymentReminderService = require('./services/paymentReminderService');
const creditManagementService = require('./services/creditManagementService');
const { syncSystemRolePermissionsFromConfig } = require('./services/rbacService');

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
const directPurchaseInvoiceRoutes = require('./routes/directPurchaseInvoiceRoutes');
const prepaidExpenseRoutes = require('./routes/prepaidExpenseRoutes');
const leaseRevenueRoutes = require('./routes/leaseRevenueRoutes');
const payrollRoutes = require('./routes/payroll');
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
const investmentModuleRoutes = require('./routes/investmentModuleRoutes');
const { copilotRoutes } = require('./copilot');
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
const roleRoutes = require('./routes/roleRoutes');
const documentNumberingRoutes = require('./routes/documentNumberingRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const vatReturnRoutes = require('./routes/vatReturnRoutes');
const companyFinanceGovernanceRoutes = require('./routes/companyFinanceGovernanceRoutes');
const systemHealthRoutes = require('./routes/systemHealthRoutes');
const marketingRoutes = require('./routes/marketingRoutes');
const systemHealthController = require('./controllers/systemHealthController');

// Create Express app
const app = express();

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Security middleware — allow cross-origin <img> / embed for /uploads (SPA may be on another origin/subdomain)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Company-Id'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // Cache preflight requests for 10 minutes
};

app.use(cors(corsOptions));

// Uploaded files — before /api rate limiter (galleries load many images per page)
const uploadsDir = path.isAbsolute(config.upload.uploadPath)
  ? config.upload.uploadPath
  : path.join(__dirname, '..', String(config.upload.uploadPath).replace(/^\.\//, ''));
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));
app.use('/api/uploads', express.static(uploadsDir));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  skip: (req) => {
    // Batched bulk-import endpoints replace many single-record calls; do not count each row as a request
    const path = req.originalUrl || req.url || '';
    return req.method === 'POST' && path.includes('/bulk-import');
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Compression middleware
app.use(compression());

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

app.get('/health/ready', systemHealthController.getReadiness);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/leads', requireModulePermission('leads'), leadRoutes);
app.use('/api/users', requireModulePermission('users'), userRoutes);
app.use('/api/roles', requireModulePermission('roles_permissions'), roleRoutes);
app.use('/api/properties', requireModulePermission('properties'), propertyRoutes);
app.use('/api/tenants', requireModulePermission('tenants'), tenantRoutes);
app.use('/api/units', requireModulePermission('units'), unitRoutes);
app.use('/api/leases', requireModulePermission('leases'), leaseRoutes);
app.use(
  '/api/building-announcements',
  requireModulePermission('leases'),
  require('./routes/buildingAnnouncementRoutes')
);
app.use('/api/payments', requireModulePermission('finance'), paymentRoutes);
app.use('/api/invoices', requireModulePermission('finance'), invoiceRoutes);
app.use('/api/tickets', requireModulePermission('helpdesk'), ticketRoutes);
app.use('/api/chart-of-accounts', requireModulePermission('chart_of_accounts'), chartOfAccountRoutes);
app.use('/api/financial-transactions', requireModulePermission('finance'), financialTransactionRoutes);
app.use('/api/budgets', requireModulePermission('budget'), budgetRoutes);
app.use('/api/journal-vouchers', requireModulePermission('journal_vouchers'), journalVoucherRoutes);
app.use('/api/system-settings', requireModulePermission('system_settings'), systemSettingRoutes);
app.use('/api/company-settings', companySettingRoutes);
app.use('/api/tax-settings', requireModulePermission('system_settings'), taxSettingRoutes);
// Finance Module - Phase 3 (Complete)
app.use('/api/vendors', requireModulePermission('vendors'), vendorRoutes);
app.use('/api/vendor-invoices', requireModulePermission('vendors'), vendorInvoiceRoutes);
app.use(
  '/api/direct-purchase-invoices',
  requireModulePermission('finance'),
  directPurchaseInvoiceRoutes
);
app.use(
  '/api/prepaid-expenses',
  requireModulePermission('finance'),
  prepaidExpenseRoutes
);
app.use(
  '/api/lease-revenue',
  requireModulePermission('finance'),
  leaseRevenueRoutes
);
app.use('/api/payroll', payrollRoutes);
app.use('/api/bank-accounts', requireModulePermission('treasury'), bankAccountRoutes);
app.use('/api/documents', requireModulePermission('reports'), documentRoutes);
app.use('/api/bank-transactions', requireModulePermission('treasury'), bankTransactionRoutes);
app.use('/api/reconciliations', requireModulePermission('treasury'), reconciliationRoutes);
app.use('/api/financial-forecasts', requireModulePermission('finance'), financialForecastRoutes);
app.use('/api/exchange-rates', requireModulePermission('treasury'), exchangeRateRoutes);
app.use('/api/finance/reports', requireModulePermission('reports'), financialReportsRoutes);
app.use('/api/custom-reports', requireModulePermission('reports'), customReportsRoutes);
app.use('/api/documents', requireModulePermission('reports'), documentRoutes);
app.use('/api/reports', reportShareRoutes);
app.use('/api/payment-gateway', requireModulePermission('finance'), paymentGatewayRoutes);
app.use('/api/standing-orders', requireModulePermission('treasury'), standingOrderRoutes);
app.use('/api/cheques', requireModulePermission('treasury'), chequeRoutes);
app.use('/api/security-deposits', requireModulePermission('finance'), securityDepositRoutes);
app.use('/api/payment-reminders', requireModulePermission('finance'), paymentReminderRoutes);
app.use('/api/petty-cash', requireModulePermission('finance'), pettyCashRoutes);
app.use('/api/credit-limits', requireModulePermission('finance'), creditLimitRoutes);
app.use('/api/bank-statements', requireModulePermission('treasury'), bankStatementRoutes);
app.use('/api/treasury/deposits', requireModulePermission('treasury'), investmentRoutes);
app.use('/api/investments', investmentModuleRoutes);
app.use('/api/copilot', copilotRoutes);
app.use('/api/treasury-reports', requireModulePermission('treasury'), treasuryReportsRoutes);
app.use('/api/settings', requireModulePermission('settings'), settingsRoutes);
app.use('/api/services', requireModulePermission('settings'), servicesRoutes);
app.use('/api/service-templates', requireModulePermission('settings'), serviceTemplatesRoutes);
app.use('/api/dashboard', requireModulePermission('dashboard'), dashboardRoutes);
app.use('/api/legal-cases', requireModulePermission('legal'), legalCaseRoutes);
// Procurement Module Routes
app.use('/api/items', requireModulePermission('procurement'), itemRoutes);
app.use('/api/purchase-orders', requireModulePermission('procurement'), purchaseOrderRoutes);
app.use('/api/goods-receipts', requireModulePermission('procurement'), goodsReceiptRoutes);
app.use('/api/purchase-invoices', requireModulePermission('procurement'), purchaseInvoiceRoutes);
app.use('/api/ledger-setups', requireModulePermission('ledger_setups'), ledgerSetupRoutes);
app.use('/api/document-numbering', requireModulePermission('document_numbering'), documentNumberingRoutes);
app.use('/api/audit-logs', requireModulePermission('settings'), auditLogRoutes);
app.use('/api/vat-returns', requireModulePermission('finance'), vatReturnRoutes);
app.use('/api/company-finance', requireModulePermission('company_finance_config'), companyFinanceGovernanceRoutes);
app.use('/api/system-health', requireModulePermission('system_health'), systemHealthRoutes);

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

    try {
      const rbacSync = await syncSystemRolePermissionsFromConfig();
      console.log('✅ RBAC permissions synced:', rbacSync);
    } catch (rbacErr) {
      console.warn('⚠️ RBAC permission sync failed (server will continue):', rbacErr.message);
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

