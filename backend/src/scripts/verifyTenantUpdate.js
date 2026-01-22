
const { sequelize } = require('../config/database');
const Tenant = require('../models/Tenant');

async function testTenantUpdate() {
  console.log('🔄 Loading configuration...');
  require('dotenv').config({ path: 'config.env' });

  // Start Transaction
  const transaction = await sequelize.transaction();

  try {
    console.log('🔄 Creating initial tenant...');
    const tenant = await Tenant.create({
        name: 'Test Tenant',
        email: 'test@example.com',
        phone: '1234567890',
        passportNumber: null, // Initially null
        visaNumber: null
    }, { transaction });

    console.log(`✅ Created tenant ID: ${tenant.id}. Passport: ${tenant.passportNumber}`);

    console.log('🔄 updating tenant details (Simulating Frontend)...');
    // Simulate what the frontend now calls
    await tenant.update({
        passportNumber: 'PASS-123',
        visaNumber: 'VISA-999',
        emergencyRelation: 'Brother'
    }, { transaction });

    // Fetch fresh
    const updatedTenant = await Tenant.findByPk(tenant.id, { transaction });
    console.log(`✅ Updated Tenant. Passport: ${updatedTenant.passportNumber}, Relation: ${updatedTenant.emergencyRelation}`);

    if (updatedTenant.passportNumber !== 'PASS-123') throw new Error('Passport update failed');
    if (updatedTenant.emergencyRelation !== 'Brother') throw new Error('Relation update failed');

    console.log('✅ Tenant Persistence Verified!');
    await transaction.rollback();
    console.log('Cleanup successful.');

  } catch (error) {
    console.error('❌ Test Failed:', error);
    if (transaction) await transaction.rollback();
  }
}

testTenantUpdate();
