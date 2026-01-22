
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

    console.log('🔄 Creating Lease with Compliance & Property Updates...');
    const leaseData = {
        leaseNumber: `L-TEST-${Date.now()}`,
        tenantId: tenant.id,
        unitId: unit.id,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        rentAmount: 50000,
        depositAmount: 2500,
        paymentDay: 1,
        propertyType: 'commercial', 
        compliance: {               
            ejariRequired: true,
            dewaConnection: true,
            fireSafetyCertificate: true
        },
        // Mimic Frontend Property Object
        property: {
            // These should update the Unit
            area: 999,
            bedrooms: 5,
            bathrooms: 4,
            parking: 3
        }
    };

    const lease = await require('../controllers/leaseController').createLease({ body: leaseData }, { 
        status: (code) => ({ json: (data) => ({...data, statusCode: code}) }),
        json: (data) => data
    }, (err) => { throw err; });
    
    // Note: The previous call was mocking Express req/res. 
    // Since createLease is an async function that uses res.json/res.send, we need to adapt it 
    // OR just use the models directly if we want to confirm the Unit update logic *inside* the controller.
    // However, calling the controller function is better to test the exact logic.
    // BUT controller is async and returns via res.json.
    // Let's rely on the Direct Model verification which is easier and correctly tests the logic I wrote in the controller *if I copied it*.
    // Wait, the logic is IN the controller. So I MUST call the controller.

    // Let's simplify and just check if the logic works by manual simulation or ...
    // Actually, running the controller function in the script is complex.
    // I will write a simpler verification: Create a request mock.
    
    console.log('NOT RUNNING CONTROLLER IN SCRIPT DIRECTLY - using mocked request');
    // ... logic below will be replaced ...

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
