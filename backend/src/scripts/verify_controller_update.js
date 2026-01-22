
const { sequelize } = require('../config/database');
const Lease = require('../models/Lease');
const Tenant = require('../models/Tenant');
const Unit = require('../models/Unit');
const Property = require('../models/Property');
const leaseController = require('../controllers/leaseController');

// Mock Express Request/Response
const mockReq = (body) => ({ body });
const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};
const mockNext = (err) => console.error('Next called with error:', err);

async function verifyControllerLogic() {
    console.log('🔄 Connecting to DB...');
    // require('dotenv').config({ path: 'config.env' }); // Assuming env is loaded or defaults work
    
    try {
        await sequelize.authenticate();

        // 1. Setup Data
        const property = await Property.create({ title: 'Test Prop', location: 'DXB', type: 'residential' });
        const tenant = await Tenant.create({ name: 'Test User', email: `test${Date.now()}@test.com`, phone: '123' });
        const unit = await Unit.create({ 
            unitNumber: 'U-101', 
            rentAmount: 1000, 
            status: 'available', 
            propertyId: property.id,
            bedrooms: 1, 
            bathrooms: 1, 
            area: 500, 
            type: 'apartment',
            parking: 0 // Start with 0
        });

        console.log(`Initial Unit Step: Bed=${unit.bedrooms}, Parking=${unit.parking}`);

        // 2. Prepare Request Payload with NEW property details
        const req = mockReq({
             leaseNumber: `L-TEST-${Date.now()}`,
             tenantId: tenant.id,
             unitId: unit.id,
             startDate: '2025-01-01',
             endDate: '2025-12-31',
             rentAmount: 50000,
             depositAmount: 2500, // Added missing required field
             paymentDay: 1,
             leaseType: 'commercial',
             propertyType: 'commercial', // Controller maps this, but let's send both or rely on map
             // THE KEY PART: Property Details to update Unit
             property: {
                 name: 'Test Prop',
                 unit: 'U-101',
                 address: 'DXB',
                 type: 'commercial',
                 area: 1500,       // Changed from 500
                 bedrooms: 3,      // Changed from 1
                 bathrooms: 2,     // Changed from 1
                 parking: 5        // Changed from 0
             }
        });

        const res = mockRes();

        // 3. Call Controller
        console.log('🔄 Calling createLease controller...');
        await leaseController.createLease(req, res, mockNext);

        if (res.data && res.data.success) {
            console.log('✅ Controller Success:', res.data.message);
            
            // 4. Verify Unit Update
            const updatedUnit = await Unit.findByPk(unit.id);
            console.log('--- Verification Result ---');
            console.log(`Area: ${updatedUnit.area} (Expected 1500)`);
            console.log(`Bedrooms: ${updatedUnit.bedrooms} (Expected 3)`);
            console.log(`Bathrooms: ${updatedUnit.bathrooms} (Expected 2)`);
            console.log(`Parking: ${updatedUnit.parking} (Expected 5)`);
            
            if (updatedUnit.parking !== 5) throw new Error('Parking validation failed!');
            if (Number(updatedUnit.area) !== 1500.00) throw new Error('Area validation failed!');

            console.log('✅ ALL CHECKS PASSED');
        } else {
            console.error('❌ Controller Failed:', res.data);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await sequelize.close();
    }
}

verifyControllerLogic();
