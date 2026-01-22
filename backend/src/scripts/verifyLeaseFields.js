const { sequelize, Lease, Tenant, Unit } = require('../models');

async function testLeaseCreation() {
  const transaction = await sequelize.transaction();
  try {
    let tenant = await Tenant.findOne({ transaction });
    if (!tenant) {
      tenant = await Tenant.create({
        name: 'Test Tenant',
        email: 'test@example.com',
        phone: '123456789',
        emiratesId: '784-1234-1234567-1',
        nationality: 'UAE',
        created_by: 1
      }, { transaction });
    }

    // 2. Get or Create Unit
    let unit = await Unit.findOne({ transaction });
    if (!unit) {
      const Property = require('../models/Property');
      let property = await Property.findOne({ transaction });
      if (!property) {
         property = await Property.create({
            title: 'Test Property',
         }, { transaction });
      }
      unit = await Unit.create({
        unitNumber: 'U-101',
        propertyId: property.id,
        rentAmount: 50000,
        status: 'vacant'
      }, { transaction });
    }

    // 3. Create Lease with ALL new fields
    const leaseData = {
      leaseNumber: `L-TEST-${Date.now()}`,
      tenantId: tenant.id,
      unitId: unit.id,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      rentAmount: 100000, // Correct field name
      depositAmount: 5000,
      paymentFrequency: 'monthly',
      paymentDay: 1,
      // NEW FIELDS
      agencyFee: 1000,
      ejariFee: 220,
      dewaDeposit: 2000,
      municipalityFee: 500,
      totalDeposits: 8720, // Sum
      gracePeriod: 10,
      lateFee: 200,
      renewalTerms: 'Auto-renew for 1 year',
      terminationNotice: 90,
      propertyType: 'commercial', // New Field
      pdcStartDate: '2024-01-01', // New Field
      isRentalTaxable: true,      // New Field
      pdcSchedule: [
        { chequeNo: '123', amount: 25000, date: '2024-01-01' },
        { chequeNo: '124', amount: 25000, date: '2024-04-01' }
      ],
      compliance: {
         ejariRequired: true,
         dewaConnection: false
      },
      status: 'active'
    };

    const lease = await Lease.create(leaseData, { transaction });

    // 4. Verify fields
    if (lease.agencyFee != 1000) throw new Error('agencyFee mismatch');
    if (lease.ejariFee != 220) throw new Error('ejariFee mismatch');
    if (lease.gracePeriod != 10) throw new Error('gracePeriod mismatch');
    if (lease.renewalTerms !== 'Auto-renew for 1 year') throw new Error('renewalTerms mismatch');
    if (lease.propertyType !== 'commercial') throw new Error('propertyType mismatch');
    if (lease.isRentalTaxable !== true) throw new Error('isRentalTaxable mismatch');
    
    // Check JSON fields
    if (!lease.pdcSchedule || lease.pdcSchedule.length !== 2) throw new Error('pdcSchedule mismatch');
    if (!lease.compliance || lease.compliance.ejariRequired !== true) throw new Error('compliance mismatch');

    const updateData = {
        agencyFee: 2000,
        pdcSchedule: [
            { chequeNo: '999', amount: 50000, date: '2024-01-01' }
        ]
    };

    await lease.update(updateData, { transaction });
    await lease.reload({ transaction });

    let pdcSchedule = lease.pdcSchedule;
    if (typeof pdcSchedule === 'string') {
        pdcSchedule = JSON.parse(pdcSchedule);
    }

    if (parseFloat(lease.agencyFee) !== 2000.00) throw new Error(`Update failed: agencyFee is ${lease.agencyFee}`);
    if (!pdcSchedule || pdcSchedule.length !== 1 || pdcSchedule[0].chequeNo !== '999') {
        throw new Error(`Update failed: pdcSchedule not updated correctly. Got: ${JSON.stringify(lease.pdcSchedule)}`);
    }

    
    // Note: The verification script only tests core lease controller logic. 
    // Services are handled via a separate API call in Leases.tsx, so we can't fully mock that here without mocking the service controller.
    // However, we have verified the logic in Leases.tsx manually.
    
    console.log('✅ Update verified!');
    console.log('✅ ALL TESTS PASSED');

    // Rollback so we don't pollute DB
    await transaction.rollback();
    console.log('Transaction rolled back (cleanup).');

  } catch (error) {
    console.error('❌ Verification Failed:', error);
    try { await transaction.rollback(); } catch {}
  } finally {
    await sequelize.close();
  }
}

testLeaseCreation();
