const Setting = require('../src/models/Setting');
const { sequelize } = require('../src/config/database');

async function initializeUAESettings() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.\n');

    const defaultSettings = [
      {
        key: 'uae_ejari_fee',
        value: '220',
        category: 'UAE',
        description: 'Default Ejari registration fee in AED',
        dataType: 'number',
        isSystem: true
      },
      {
        key: 'uae_dewa_deposit_percentage',
        value: '10',
        category: 'UAE',
        description: 'DEWA deposit as percentage of monthly rent',
        dataType: 'number',
        isSystem: true
      },
      {
        key: 'uae_security_deposit_months',
        value: '1',
        category: 'UAE',
        description: 'Security deposit as number of months rent',
        dataType: 'number',
        isSystem: true
      },
      {
        key: 'uae_agency_fee_percentage',
        value: '5',
        category: 'UAE',
        description: 'Agency fee as percentage of annual rent',
        dataType: 'number',
        isSystem: true
      },
      {
        key: 'uae_municipality_fee_percentage',
        value: '5',
        category: 'UAE',
        description: 'Municipality fee as percentage of annual rent',
        dataType: 'number',
        isSystem: true
      },
      {
        key: 'lease_grace_period_days',
        value: '5',
        category: 'UAE',
        description: 'Default grace period for rent payment in days',
        dataType: 'number',
        isSystem: false
      },
      {
        key: 'pdc_required',
        value: 'true',
        category: 'UAE',
        description: 'Whether post-dated cheques are required by default',
        dataType: 'boolean',
        isSystem: false
      }
    ];

    console.log('🔄 Initializing UAE Settings...\n');
    
    for (const setting of defaultSettings) {
      const [record, created] = await Setting.findOrCreate({
        where: { key: setting.key },
        defaults: setting
      });
      
      if (created) {
        console.log(`✅ Created: ${setting.key} = ${setting.value}`);
      } else {
        console.log(`ℹ️  Exists: ${setting.key} = ${record.value}`);
      }
    }

    console.log('\n✅ UAE Settings initialization complete!');
    console.log('\n📋 Summary:');
    console.log('   - Ejari Fee: AED 220');
    console.log('   - DEWA Deposit: 10% of monthly rent');
    console.log('   - Security Deposit: 1 month rent');
    console.log('   - Agency Fee: 5% of annual rent');
    console.log('   - Municipality Fee: 5% of annual rent');
    console.log('   - Grace Period: 5 days');
    console.log('   - PDC Required: Yes\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing UAE settings:', error);
    process.exit(1);
  }
}

initializeUAESettings();
