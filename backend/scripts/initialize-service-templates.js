const { sequelize } = require('../src/config/database');
const ServiceTemplate = require('../src/models/ServiceTemplate');

const defaultTemplates = [
  {
    name: 'Security Deposit',
    defaultAmount: 0,
    isTaxable: false,
    billingMethod: 'charged_separately',
    description: 'Security deposit (typically 1 month rent)',
    category: 'UAE Mandatory',
    isSystem: true,
    sortOrder: 1
  },
  {
    name: 'Agency Fee',
    defaultAmount: 0,
    isTaxable: true,
    billingMethod: 'charged_separately',
    description: 'Agency commission (typically 5% of annual rent)',
    category: 'UAE Mandatory',
    isSystem: true,
    sortOrder: 2
  },
  {
    name: 'Ejari Registration Fee',
    defaultAmount: 220,
    isTaxable: false,
    billingMethod: 'charged_separately',
    description: 'Dubai Land Department Ejari registration fee',
    category: 'UAE Mandatory',
    isSystem: true,
    sortOrder: 3
  },
  {
    name: 'DEWA Deposit',
    defaultAmount: 0,
    isTaxable: false,
    billingMethod: 'charged_separately',
    description: 'Dubai Electricity and Water Authority deposit',
    category: 'UAE Mandatory',
    isSystem: true,
    sortOrder: 4
  },
  {
    name: 'Municipality Fee',
    defaultAmount: 0,
    isTaxable: false,
    billingMethod: 'charged_separately',
    description: 'Municipality housing fee (typically 5% of annual rent)',
    category: 'UAE Mandatory',
    isSystem: true,
    sortOrder: 5
  },
  {
    name: 'Chiller Charges',
    defaultAmount: 0,
    isTaxable: false,
    billingMethod: 'charged_separately',
    description: 'District cooling charges (if applicable)',
    category: 'Optional',
    isSystem: true,
    sortOrder: 6
  },
  {
    name: 'Parking Fee',
    defaultAmount: 0,
    isTaxable: false,
    billingMethod: 'charged_separately',
    description: 'Additional parking space charges',
    category: 'Optional',
    isSystem: true,
    sortOrder: 7
  },
  {
    name: 'Maintenance Fee',
    defaultAmount: 0,
    isTaxable: false,
    billingMethod: 'charged_separately',
    description: 'Annual maintenance charges',
    category: 'Optional',
    isSystem: true,
    sortOrder: 8
  }
];

async function initializeServiceTemplates() {
  try {
    console.log('🔵 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    console.log('\n🔵 Checking existing service templates...');
    const existingCount = await ServiceTemplate.count();

    if (existingCount > 0) {
      console.log(`ℹ️  Found ${existingCount} existing service template(s)`);
      console.log('❓ Do you want to:');
      console.log('   1. Skip initialization (keep existing)');
      console.log('   2. Add only missing templates');
      console.log('   3. Clear all and reinitialize');
      console.log('\nℹ️  Skipping initialization to preserve existing data');
      return;
    }

    console.log('\n🔵 Creating default service templates...\n');

    for (const template of defaultTemplates) {
      try {
        const created = await ServiceTemplate.create(template);
        console.log(`✅ Created: ${created.name} (${created.category})`);
      } catch (error) {
        console.error(`❌ Failed to create ${template.name}:`, error.message);
      }
    }

    console.log(`\n✅ Successfully initialized ${defaultTemplates.length} service templates!\n`);

    // Display summary
    const uaeMandatory = defaultTemplates.filter(t => t.category === 'UAE Mandatory').length;
    const optional = defaultTemplates.filter(t => t.category === 'Optional').length;

    console.log('📊 Summary:');
    console.log(`   - UAE Mandatory: ${uaeMandatory} templates`);
    console.log(`   - Optional: ${optional} templates`);
    console.log(`   - Total: ${defaultTemplates.length} templates\n`);

  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  initializeServiceTemplates();
}

module.exports = initializeServiceTemplates;
