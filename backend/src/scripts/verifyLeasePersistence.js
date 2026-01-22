
const { sequelize } = require('../config/database');
const Lease = require('../models/Lease');
const Tenant = require('../models/Tenant');
const Unit = require('../models/Unit');

async function verifyLeasePersistence() {
  console.log('🔄 Loading configuration...');
  require('dotenv').config({ path: 'config.env' });

  // Transaction for safety
  const t = await sequelize.transaction();

  try {
    console.log('🔄 Checking database connection...');
    await sequelize.authenticate();
    
    // Create Dummy Dependencies if needed (assuming they exist or creating minimal ones)
    // For simplicity, assuming ID 1 exists for Tenant and Unit or creating new ones.
    // Let's create proper placeholders.
    // Create proper hierarchy
    const property = await require('../models/Property').create({
        title: 'Test Property',
        location: 'Dubai',
        type: 'residential'
    }, { transaction: t });

    const tenant = await Tenant.create({ name: 'Test Tenant', email: 'test.compliance@example.com', phone: '123' }, { transaction: t });
    const unit = await Unit.create({ 
        unitNumber: 'U-999', 
        rentAmount: 1000, 
        status: 'available', 
        propertyId: property.id,
        bedrooms: 1,
        bathrooms: 1,
        area: 500,
        type: 'apartment'
    }, { transaction: t });

    console.log('🔄 Creating Lease with Compliance & Property Type...');
    const leaseData = {
        leaseNumber: `L-TEST-${Date.now()}`,
        tenantId: tenant.id,
        unitId: unit.id,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        rentAmount: 50000,
        depositAmount: 2500,
        paymentDay: 1,
        propertyType: 'commercial', // TESTING THIS
        compliance: {               // TESTING THIS
            ejariRequired: true,
            dewaConnection: true,
            fireSafetyCertificate: true
        }
    };

    const lease = await Lease.create(leaseData, { transaction: t });
    console.log(`✅ Lease created: ${lease.id}`);

    // Fetch back
    const fetchedLease = await Lease.findByPk(lease.id, { transaction: t });
    
    console.log('--- Verification ---');
    console.log(`Property Type: ${fetchedLease.propertyType}`);
    console.log(`Compliance:`, fetchedLease.compliance);

    const complianceObj = typeof fetchedLease.compliance === 'string' 
        ? JSON.parse(fetchedLease.compliance) 
        : fetchedLease.compliance;

    if (fetchedLease.propertyType !== 'commercial') throw new Error('Property Type NOT saved');
    if (!complianceObj.ejariRequired) throw new Error('Compliance Ejari NOT saved');
    
    console.log('✅ All checks passed!');
    
    await t.rollback();
    console.log('Cleanup successful.');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    if (t) await t.rollback();
  }
}

verifyLeasePersistence();
