/**
 * Finance Module Seed Data Script
 * Populates database with sample data for finance management features
 * Run after: npm run migrate:run
 */

require('dotenv').config({ path: './config.env' });
const {
  Vendor,
  VendorInvoice,
  BankAccount,
  BankTransaction,
  Reconciliation,
  FinancialForecast,
  ExchangeRate,
  BudgetCategory,
  ChartOfAccount,
  Budget,
  User,
  Property,
  sequelize
} = require('../models');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
};

/**
 * Seed Finance Data
 */
async function seedFinance() {
  const transaction = await sequelize.transaction();

  try {
    log.info('🌱 Starting Finance Module Seeding...\n');

    // Get first user and property for relationships
    const firstUser = await User.findOne();
    const firstProperty = await Property.findOne();

    if (!firstUser) {
      throw new Error('No users found! Please seed users first.');
    }

    const userId = firstUser.id;
    const propertyId = firstProperty ? firstProperty.id : null;

    // ========================================
    // 1. SEED VENDORS
    // ========================================
    log.info('Seeding Vendors...');
    
    const vendorsData = [
      {
        vendorName: 'Emirates Maintenance Services LLC',
        contactPerson: 'Ahmed Al Mansoori',
        email: 'contact@emiratesmaintenance.ae',
        phone: '+971-4-3456789',
        address: 'Business Bay, Dubai, UAE',
        trn: 'TRN100234567890001',
        paymentTerms: 'Net 30',
        bankDetails: {
          bankName: 'Emirates NBD',
          accountNumber: 'AE070331234567890123456',
          iban: 'AE070331234567890123456',
          swiftCode: 'EBILAEAD'
        },
        status: 'active',
        notes: 'Preferred vendor for HVAC and electrical works',
        createdBy: userId
      },
      {
        vendorName: 'Dubai Facility Management Co.',
        contactPerson: 'Mohammed Hassan',
        email: 'billing@dubaifm.ae',
        phone: '+971-4-5678901',
        address: 'Jumeirah Lake Towers, Dubai, UAE',
        trn: 'TRN100234567890002',
        paymentTerms: 'Net 45',
        bankDetails: {
          bankName: 'Mashreq Bank',
          accountNumber: 'AE080230987654321098765',
          iban: 'AE080230987654321098765',
          swiftCode: 'BOMLAEAD'
        },
        status: 'active',
        createdBy: userId
      },
      {
        vendorName: 'Al Futtaim Cleaning Services',
        contactPerson: 'Khalid Al Futtaim',
        email: 'info@alfuttaimcleaning.ae',
        phone: '+971-4-2345678',
        address: 'Al Quoz, Dubai, UAE',
        trn: 'TRN100234567890003',
        paymentTerms: 'Net 15',
        bankDetails: {
          bankName: 'Abu Dhabi Commercial Bank',
          accountNumber: 'AE090331234567890123456',
          iban: 'AE090331234567890123456',
          swiftCode: 'ADCBAEAA'
        },
        status: 'active',
        notes: 'Monthly cleaning contracts',
        createdBy: userId
      },
      {
        vendorName: 'Emirates Security Solutions',
        contactPerson: 'Rashid Al Maktoum',
        email: 'security@emiratessecurity.ae',
        phone: '+971-4-8765432',
        address: 'Dubai Marina, Dubai, UAE',
        trn: 'TRN100234567890004',
        paymentTerms: 'Net 30',
        bankDetails: {
          bankName: 'First Abu Dhabi Bank',
          accountNumber: 'AE100331234567890123456',
          iban: 'AE100331234567890123456',
          swiftCode: 'NBADAEAA'
        },
        status: 'active',
        createdBy: userId
      },
      {
        vendorName: 'Gulf Property Insurance LLC',
        contactPerson: 'Sara Al Nahyan',
        email: 'claims@gulfinsurance.ae',
        phone: '+971-2-6543210',
        address: 'Abu Dhabi, UAE',
        trn: 'TRN100234567890005',
        paymentTerms: 'Net 60',
        status: 'active',
        notes: 'Property insurance provider',
        createdBy: userId
      }
    ];

    const vendors = await Vendor.bulkCreate(vendorsData, { transaction });
    log.success(`Created ${vendors.length} vendors`);

    // ========================================
    // 2. SEED VENDOR INVOICES
    // ========================================
    log.info('Seeding Vendor Invoices...');
    
    const vendorInvoicesData = [
      {
        invoiceNumber: 'VI-2024-001',
        vendorId: vendors[0].id,
        propertyId: propertyId,
        invoiceDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-14'),
        subtotal: 15000,
        taxAmount: 750,
        totalAmount: 15750,
        status: 'approved',
        paymentStatus: 'paid',
        description: 'HVAC maintenance - January 2024',
        createdBy: userId,
        approvedBy: userId,
        approvedAt: new Date('2024-01-16')
      },
      {
        invoiceNumber: 'VI-2024-002',
        vendorId: vendors[1].id,
        propertyId: propertyId,
        invoiceDate: new Date('2024-02-01'),
        dueDate: new Date('2024-03-17'),
        subtotal: 8500,
        taxAmount: 425,
        totalAmount: 8925,
        status: 'approved',
        paymentStatus: 'partially_paid',
        description: 'Facility management services - February',
        createdBy: userId,
        approvedBy: userId,
        approvedAt: new Date('2024-02-02')
      },
      {
        invoiceNumber: 'VI-2024-003',
        vendorId: vendors[2].id,
        propertyId: propertyId,
        invoiceDate: new Date('2024-03-01'),
        dueDate: new Date('2024-03-16'),
        subtotal: 3200,
        taxAmount: 160,
        totalAmount: 3360,
        status: 'approved',
        paymentStatus: 'paid',
        description: 'Cleaning services - March',
        createdBy: userId
      },
      {
        invoiceNumber: 'VI-2024-004',
        vendorId: vendors[3].id,
        propertyId: propertyId,
        invoiceDate: new Date('2024-04-05'),
        dueDate: new Date('2024-05-05'),
        subtotal: 12000,
        taxAmount: 600,
        totalAmount: 12600,
        status: 'pending_approval',
        paymentStatus: 'unpaid',
        description: 'Security services - Q1 2024',
        createdBy: userId
      },
      {
        invoiceNumber: 'VI-2024-005',
        vendorId: vendors[0].id,
        propertyId: propertyId,
        invoiceDate: new Date('2024-05-10'),
        dueDate: new Date('2024-06-09'),
        subtotal: 18500,
        taxAmount: 925,
        totalAmount: 19425,
        status: 'approved',
        paymentStatus: 'unpaid',
        description: 'AC repair and maintenance',
        createdBy: userId,
        approvedBy: userId,
        approvedAt: new Date('2024-05-12')
      }
    ];

    const vendorInvoices = await VendorInvoice.bulkCreate(vendorInvoicesData, { transaction });
    log.success(`Created ${vendorInvoices.length} vendor invoices`);

    // ========================================
    // 3. SEED BANK ACCOUNTS
    // ========================================
    log.info('Seeding Bank Accounts...');
    
    // First, get or create a bank account in Chart of Accounts
    let bankChartAccount = await ChartOfAccount.findOne({ 
      where: { accountType: 'asset' },
      transaction 
    });

    const bankAccountsData = [
      {
        bankName: 'Emirates NBD',
        accountName: 'Emirates Lease Flow - Operating Account',
        accountNumber: 'ENBD-1234567890',
        iban: 'AE070331234567890123456',
        swiftCode: 'EBILAEAD',
        currency: 'AED',
        currentBalance: 450000.00,
        chartAccountId: bankChartAccount ? bankChartAccount.id : null,
        status: 'active',
        notes: 'Main operating account for daily transactions',
        createdBy: userId
      },
      {
        bankName: 'Mashreq Bank',
        accountName: 'Emirates Lease Flow - Reserve Account',
        accountNumber: 'MASH-9876543210',
        iban: 'AE080230987654321098765',
        swiftCode: 'BOMLAEAD',
        currency: 'AED',
        currentBalance: 850000.00,
        chartAccountId: bankChartAccount ? bankChartAccount.id : null,
        status: 'active',
        notes: 'Reserve account for capital expenditures',
        createdBy: userId
      },
      {
        bankName: 'First Abu Dhabi Bank',
        accountName: 'Emirates Lease Flow - USD Account',
        accountNumber: 'FAB-5555666677',
        iban: 'AE100331234567890123456',
        swiftCode: 'NBADAEAA',
        currency: 'USD',
        currentBalance: 125000.00,
        chartAccountId: bankChartAccount ? bankChartAccount.id : null,
        status: 'active',
        notes: 'Foreign currency account for international transactions',
        createdBy: userId
      }
    ];

    const bankAccounts = await BankAccount.bulkCreate(bankAccountsData, { transaction });
    log.success(`Created ${bankAccounts.length} bank accounts`);

    // ========================================
    // 4. SEED EXCHANGE RATES
    // ========================================
    log.info('Seeding Exchange Rates...');
    
    const exchangeRatesData = [
      {
        fromCurrency: 'AED',
        toCurrency: 'USD',
        rate: 0.272,
        effectiveDate: new Date('2024-01-01'),
        source: 'central_bank',
        createdBy: userId
      },
      {
        fromCurrency: 'USD',
        toCurrency: 'AED',
        rate: 3.6725,
        effectiveDate: new Date('2024-01-01'),
        source: 'central_bank',
        createdBy: userId
      },
      {
        fromCurrency: 'AED',
        toCurrency: 'EUR',
        rate: 0.250,
        effectiveDate: new Date('2024-01-01'),
        source: 'api',
        createdBy: userId
      },
      {
        fromCurrency: 'EUR',
        toCurrency: 'AED',
        rate: 4.00,
        effectiveDate: new Date('2024-01-01'),
        source: 'api',
        createdBy: userId
      },
      {
        fromCurrency: 'AED',
        toCurrency: 'GBP',
        rate: 0.215,
        effectiveDate: new Date('2024-01-01'),
        source: 'api',
        createdBy: userId
      }
    ];

    const exchangeRates = await ExchangeRate.bulkCreate(exchangeRatesData, { transaction });
    log.success(`Created ${exchangeRates.length} exchange rates`);

    // ========================================
    // 5. SEED BANK TRANSACTIONS
    // ========================================
    log.info('Seeding Bank Transactions...');
    
    const bankTransactionsData = [
      // Inflows (Credits)
      {
        bankAccountId: bankAccounts[0].id,
        transactionDate: new Date('2024-01-15'),
        description: 'Rent payment - Marina Tower Unit 501',
        reference: 'TXN-20240115-001',
        amount: 85000.00,
        currency: 'AED',
        transactionType: 'credit',
        isReconciled: true,
        createdBy: userId
      },
      {
        bankAccountId: bankAccounts[0].id,
        transactionDate: new Date('2024-01-20'),
        description: 'Rent payment - Business Bay Office 302',
        reference: 'TXN-20240120-002',
        amount: 125000.00,
        currency: 'AED',
        transactionType: 'credit',
        isReconciled: true,
        createdBy: userId
      },
      {
        bankAccountId: bankAccounts[0].id,
        transactionDate: new Date('2024-02-01'),
        description: 'Security deposit - New tenant',
        reference: 'TXN-20240201-003',
        amount: 50000.00,
        currency: 'AED',
        transactionType: 'credit',
        isReconciled: false,
        createdBy: userId
      },
      // Outflows (Debits)
      {
        bankAccountId: bankAccounts[0].id,
        transactionDate: new Date('2024-01-25'),
        description: 'Maintenance payment - HVAC repairs',
        reference: 'TXN-20240125-004',
        amount: -15750.00,
        currency: 'AED',
        transactionType: 'debit',
        isReconciled: true,
        createdBy: userId
      },
      {
        bankAccountId: bankAccounts[0].id,
        transactionDate: new Date('2024-02-10'),
        description: 'Cleaning services payment',
        reference: 'TXN-20240210-005',
        amount: -3360.00,
        currency: 'AED',
        transactionType: 'debit',
        isReconciled: false,
        createdBy: userId
      },
      {
        bankAccountId: bankAccounts[0].id,
        transactionDate: new Date('2024-03-05'),
        description: 'Property insurance premium',
        reference: 'TXN-20240305-006',
        amount: -28000.00,
        currency: 'AED',
        transactionType: 'debit',
        isReconciled: false,
        createdBy: userId
      },
      {
        bankAccountId: bankAccounts[1].id,
        transactionDate: new Date('2024-02-15'),
        description: 'Transfer to reserve account',
        reference: 'TXN-20240215-007',
        amount: 100000.00,
        currency: 'AED',
        transactionType: 'credit',
        isReconciled: true,
        createdBy: userId
      }
    ];

    const bankTransactions = await BankTransaction.bulkCreate(bankTransactionsData, { transaction });
    log.success(`Created ${bankTransactions.length} bank transactions`);

    // ========================================
    // 6. SEED RECONCILIATIONS
    // ========================================
    log.info('Seeding Reconciliations...');
    
    const reconciliationsData = [
      {
        bankAccountId: bankAccounts[0].id,
        reconciliationDate: new Date('2024-01-31'),
        statementBalance: 450000.00,
        systemBalance: 450000.00,
        difference: 0.00,
        status: 'approved',
        reconciledBy: userId,
        approvedBy: userId,
        approvedAt: new Date('2024-02-01'),
        notes: 'January 2024 reconciliation - All transactions matched'
      },
      {
        bankAccountId: bankAccounts[0].id,
        reconciliationDate: new Date('2024-02-29'),
        statementBalance: 455000.00,
        systemBalance: 453000.00,
        difference: 2000.00,
        status: 'in_progress',
        reconciledBy: userId,
        notes: 'February 2024 reconciliation - Investigating 2,000 AED discrepancy'
      },
      {
        bankAccountId: bankAccounts[1].id,
        reconciliationDate: new Date('2024-01-31'),
        statementBalance: 850000.00,
        systemBalance: 850000.00,
        difference: 0.00,
        status: 'completed',
        reconciledBy: userId,
        notes: 'Reserve account - January 2024'
      }
    ];

    const reconciliations = await Reconciliation.bulkCreate(reconciliationsData, { transaction });
    log.success(`Created ${reconciliations.length} reconciliations`);

    // Update reconciled bank transactions
    await BankTransaction.update(
      { reconciliationId: reconciliations[0].id },
      { 
        where: { 
          bankAccountId: bankAccounts[0].id, 
          isReconciled: true 
        },
        transaction 
      }
    );

    // ========================================
    // 7. SEED FINANCIAL FORECASTS
    // ========================================
    log.info('Seeding Financial Forecasts...');
    
    const forecastsData = [
      {
        forecastName: 'Q2 2024 Revenue Forecast',
        periodStart: new Date('2024-04-01'),
        periodEnd: new Date('2024-06-30'),
        forecastType: 'revenue',
        projectedRevenue: 1850000.00,
        projectedExpenses: 0,
        projectedProfit: 0,
        accuracyScore: null,
        status: 'active',
        notes: 'Based on current occupancy rates and lease renewals',
        createdBy: userId
      },
      {
        forecastName: 'Q2 2024 Expense Forecast',
        periodStart: new Date('2024-04-01'),
        periodEnd: new Date('2024-06-30'),
        forecastType: 'expenses',
        projectedRevenue: 0,
        projectedExpenses: 485000.00,
        projectedProfit: 0,
        accuracyScore: null,
        status: 'active',
        notes: 'Includes maintenance, utilities, and operational costs',
        createdBy: userId
      },
      {
        forecastName: 'Q2 2024 Cash Flow Forecast',
        periodStart: new Date('2024-04-01'),
        periodEnd: new Date('2024-06-30'),
        forecastType: 'cash_flow',
        projectedRevenue: 1850000.00,
        projectedExpenses: 485000.00,
        projectedProfit: 1365000.00,
        accuracyScore: null,
        status: 'active',
        notes: 'Net cash flow projection for Q2',
        createdBy: userId
      },
      {
        forecastName: 'Annual 2024 Profit Forecast',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-12-31'),
        forecastType: 'profit',
        projectedRevenue: 7200000.00,
        projectedExpenses: 1950000.00,
        projectedProfit: 5250000.00,
        accuracyScore: 87.5,
        status: 'active',
        notes: 'Full year 2024 profit projection',
        createdBy: userId
      },
      {
        forecastName: 'Q1 2024 Actual (Closed)',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-03-31'),
        forecastType: 'profit',
        projectedRevenue: 1650000.00,
        projectedExpenses: 425000.00,
        projectedProfit: 1225000.00,
        accuracyScore: 92.3,
        status: 'completed',
        notes: 'Q1 actual vs forecast - 92.3% accuracy',
        createdBy: userId
      }
    ];

    const forecasts = await FinancialForecast.bulkCreate(forecastsData, { transaction });
    log.success(`Created ${forecasts.length} financial forecasts`);

    // ========================================
    // 8. SEED BUDGET CATEGORIES
    // ========================================
    log.info('Seeding Budget Categories...');
    
    // Get existing budgets
    const existingBudgets = await Budget.findAll({ transaction });
    
    if (existingBudgets.length > 0) {
      const budgetCategoriesData = existingBudgets.flatMap(budget => [
        {
          budgetId: budget.id,
          accountId: null,
          categoryName: 'Property Maintenance',
          budgetedAmount: budget.totalBudget * 0.35,
          spentAmount: budget.spentAmount * 0.40,
          remainingAmount: (budget.totalBudget * 0.35) - (budget.spentAmount * 0.40),
          variance: (budget.spentAmount * 0.40) - (budget.totalBudget * 0.35)
        },
        {
          budgetId: budget.id,
          accountId: null,
          categoryName: 'Utilities',
          budgetedAmount: budget.totalBudget * 0.25,
          spentAmount: budget.spentAmount * 0.30,
          remainingAmount: (budget.totalBudget * 0.25) - (budget.spentAmount * 0.30),
          variance: (budget.spentAmount * 0.30) - (budget.totalBudget * 0.25)
        },
        {
          budgetId: budget.id,
          accountId: null,
          categoryName: 'Insurance',
          budgetedAmount: budget.totalBudget * 0.15,
          spentAmount: budget.spentAmount * 0.15,
          remainingAmount: (budget.totalBudget * 0.15) - (budget.spentAmount * 0.15),
          variance: (budget.spentAmount * 0.15) - (budget.totalBudget * 0.15)
        },
        {
          budgetId: budget.id,
          accountId: null,
          categoryName: 'Security Services',
          budgetedAmount: budget.totalBudget * 0.15,
          spentAmount: budget.spentAmount * 0.10,
          remainingAmount: (budget.totalBudget * 0.15) - (budget.spentAmount * 0.10),
          variance: (budget.spentAmount * 0.10) - (budget.totalBudget * 0.15)
        },
        {
          budgetId: budget.id,
          accountId: null,
          categoryName: 'Administrative Expenses',
          budgetedAmount: budget.totalBudget * 0.10,
          spentAmount: budget.spentAmount * 0.05,
          remainingAmount: (budget.totalBudget * 0.10) - (budget.spentAmount * 0.05),
          variance: (budget.spentAmount * 0.05) - (budget.totalBudget * 0.10)
        }
      ]);

      const budgetCategories = await BudgetCategory.bulkCreate(budgetCategoriesData, { transaction });
      log.success(`Created ${budgetCategories.length} budget categories`);
    } else {
      log.warn('No existing budgets found, skipping budget categories');
    }

    // ========================================
    // 9. UPDATE CHART OF ACCOUNTS
    // ========================================
    log.info('Updating Chart of Accounts with new fields...');
    
    // Update bank accounts to be reconcilable
    const updatedAccounts = await ChartOfAccount.update(
      {
        isReconcilable: true,
        taxCategory: 'vat_applicable'
      },
      {
        where: { accountType: 'asset' },
        transaction
      }
    );
    
    if (updatedAccounts[0] > 0) {
      log.success(`Updated ${updatedAccounts[0]} chart of accounts entries`);
    }

    // Commit transaction
    await transaction.commit();

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n' + '='.repeat(60));
    log.success('Finance Module Seeding Completed Successfully! 🎉');
    console.log('='.repeat(60));
    console.log(`\n${colors.cyan}Summary:${colors.reset}`);
    console.log(`  ✓ Vendors: ${vendors.length}`);
    console.log(`  ✓ Vendor Invoices: ${vendorInvoices.length}`);
    console.log(`  ✓ Bank Accounts: ${bankAccounts.length}`);
    console.log(`  ✓ Bank Transactions: ${bankTransactions.length}`);
    console.log(`  ✓ Reconciliations: ${reconciliations.length}`);
    console.log(`  ✓ Exchange Rates: ${exchangeRates.length}`);
    console.log(`  ✓ Financial Forecasts: ${forecasts.length}`);
    console.log(`  ✓ Budget Categories: ${existingBudgets.length > 0 ? existingBudgets.length * 5 : 0}`);
    console.log(`  ✓ Chart of Accounts Updated: ${updatedAccounts[0] || 0}\n`);

    return true;

  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    log.error(`Seeding failed: ${error.message}`);
    console.error(error.stack);
    return false;
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  seedFinance()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log.error(`Fatal error: ${error.message}`);
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = { seedFinance };

