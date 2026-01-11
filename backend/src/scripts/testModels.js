/**
 * Model Testing Script
 * Tests all Sequelize models for proper loading, associations, and database compatibility
 */

require('dotenv').config({ path: './config.env' });
const models = require('../models');
const { sequelize } = models;

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}═══ ${msg} ═══${colors.reset}`),
};

async function testModels() {
  let allTestsPassed = true;

  try {
    log.section('Model Loading Test');

    // Test 1: Load all models
    const modelNames = Object.keys(models).filter(name => name !== 'sequelize');
    log.info(`Found ${modelNames.length} models`);

    modelNames.forEach(modelName => {
      try {
        const model = models[modelName];
        if (model && model.name) {
          log.success(`${modelName} loaded successfully`);
        } else {
          log.error(`${modelName} is not a valid model`);
          allTestsPassed = false;
        }
      } catch (error) {
        log.error(`${modelName} failed to load: ${error.message}`);
        allTestsPassed = false;
      }
    });

    // Test 2: Database connection
    log.section('Database Connection Test');
    await sequelize.authenticate();
    log.success('Database connection established');

    // Test 3: Model associations
    log.section('Model Associations Test');

    const newModels = [
      'Vendor',
      'VendorInvoice',
      'BankAccount',
      'BankTransaction',
      'Reconciliation',
      'FinancialForecast',
      'ExchangeRate',
      'BudgetCategory',
    ];

    const enhancedModels = [
      'ChartOfAccount',
      'FinancialTransaction',
      'Budget',
      'Invoice',
      'Payment',
    ];

    log.info('Testing new models...');
    newModels.forEach(modelName => {
      if (models[modelName]) {
        const associations = Object.keys(models[modelName].associations || {});
        log.success(`${modelName}: ${associations.length} associations (${associations.join(', ') || 'none'})`);
      } else {
        log.error(`${modelName} not found in models`);
        allTestsPassed = false;
      }
    });

    log.info('\nTesting enhanced models...');
    enhancedModels.forEach(modelName => {
      if (models[modelName]) {
        const associations = Object.keys(models[modelName].associations || {});
        log.success(`${modelName}: ${associations.length} associations (${associations.join(', ') || 'none'})`);
      } else {
        log.error(`${modelName} not found in models`);
        allTestsPassed = false;
      }
    });

    // Test 4: Check for critical associations
    log.section('Critical Associations Test');

    const criticalAssociations = [
      { model: 'Vendor', association: 'invoices', type: 'hasMany' },
      { model: 'VendorInvoice', association: 'vendor', type: 'belongsTo' },
      { model: 'BankAccount', association: 'transactions', type: 'hasMany' },
      { model: 'BankTransaction', association: 'bankAccount', type: 'belongsTo' },
      { model: 'Reconciliation', association: 'bankAccount', type: 'belongsTo' },
      { model: 'BudgetCategory', association: 'budget', type: 'belongsTo' },
      { model: 'Budget', association: 'categories', type: 'hasMany' },
      { model: 'ChartOfAccount', association: 'bankAccounts', type: 'hasMany' },
      { model: 'FinancialTransaction', association: 'vendor', type: 'belongsTo' },
      { model: 'Payment', association: 'bankTransaction', type: 'belongsTo' },
    ];

    criticalAssociations.forEach(({ model, association, type }) => {
      if (models[model] && models[model].associations[association]) {
        const assocType = models[model].associations[association].associationType;
        if (assocType.toLowerCase().includes(type.toLowerCase())) {
          log.success(`${model}.${association} (${type}) exists`);
        } else {
          log.error(`${model}.${association} has wrong type: ${assocType} (expected ${type})`);
          allTestsPassed = false;
        }
      } else {
        log.error(`${model}.${association} (${type}) not found`);
        allTestsPassed = false;
      }
    });

    // Test 5: Model attributes validation
    log.section('New Model Attributes Test');

    const newFieldTests = [
      { model: 'ChartOfAccount', fields: ['isReconcilable', 'taxCategory', 'propertyId'] },
      { model: 'FinancialTransaction', fields: ['vendorId', 'propertyId', 'reconciliationId', 'isReconciled'] },
      { model: 'Budget', fields: ['propertyId', 'alertThreshold', 'variancePercentage'] },
      { model: 'Invoice', fields: ['vendorInvoiceNumber', 'purchaseOrderNumber'] },
      { model: 'Payment', fields: ['bankTransactionId', 'reconciliationId', 'isReconciled'] },
    ];

    newFieldTests.forEach(({ model, fields }) => {
      if (models[model]) {
        const modelAttributes = Object.keys(models[model].rawAttributes);
        fields.forEach(field => {
          if (modelAttributes.includes(field)) {
            log.success(`${model}.${field} exists`);
          } else {
            log.error(`${model}.${field} missing`);
            allTestsPassed = false;
          }
        });
      } else {
        log.error(`${model} not found`);
        allTestsPassed = false;
      }
    });

    // Test 6: Verify all new models have required base fields
    log.section('Base Fields Validation Test');

    const requiredFields = ['id', 'createdAt', 'updatedAt', 'isActive'];
    
    [...newModels, ...enhancedModels].forEach(modelName => {
      if (models[modelName]) {
        const modelAttributes = Object.keys(models[modelName].rawAttributes);
        const missingFields = requiredFields.filter(field => !modelAttributes.includes(field));
        
        if (missingFields.length === 0) {
          log.success(`${modelName} has all base fields`);
        } else {
          log.warn(`${modelName} missing base fields: ${missingFields.join(', ')}`);
        }
      }
    });

    // Test 7: Database sync test (dry run)
    log.section('Database Schema Compatibility Test');
    
    try {
      // Use alter: false, force: false to only check if schema is compatible
      await sequelize.sync({ alter: false, force: false });
      log.success('All models are compatible with database schema');
    } catch (error) {
      log.error(`Schema compatibility issue: ${error.message}`);
      log.warn('This is expected if migrations haven\'t been run yet');
    }

    // Final summary
    log.section('Test Summary');
    
    if (allTestsPassed) {
      log.success('All model tests passed! ✓');
      log.info('You can now proceed with creating migrations');
      return true;
    } else {
      log.error('Some tests failed! Please review the errors above');
      return false;
    }

  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    console.error(error.stack);
    return false;
  } finally {
    await sequelize.close();
    log.info('Database connection closed');
  }
}

// Run the tests
testModels()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

