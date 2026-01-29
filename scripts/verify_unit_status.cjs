const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
// const AUTH_TOKEN = process.env.AUTH_TOKEN || process.argv[2];

// if (!AUTH_TOKEN) {
//   console.error('Error: Bearer token is required as an argument.');
//   console.log('Usage: node scripts/verify_unit_status.cjs <BEARER_TOKEN>');
//   process.exit(1);
// }

const headers = {
  // 'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

async function verifyLifecycle() {
  try {
    // 1. Create a Unit
    console.log('\n1. Creating Test Unit...');
    const unitRes = await axios.post(`${BASE_URL}/units`, {
      unitNumber: `TEST-STAT-${Date.now()}`,
      propertyId: 1, // Assuming property 1 exists
      type: 'Apartment',
      status: 'available',
      rentAmount: 50000,
      area: 1000,
      bedrooms: 1,
      bathrooms: 1
    }, { headers });
    
    const unitId = unitRes.data.data.id;
    console.log(`Unit Created: ID ${unitId}, Status: ${unitRes.data.data.status}`);

    if (unitRes.data.data.status.toLowerCase() !== 'available') {
      throw new Error(`Expected status 'available', got '${unitRes.data.data.status}'`);
    }

    // 2. Create an Active Lease for this Unit
    console.log('\n2. Creating Active Lease...');
    const leaseRes = await axios.post(`${BASE_URL}/leases`, {
      tenantId: 1, // Assuming tenant 1 exists
      unitId: unitId,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000 * 365).toISOString(), // 1 year
      rentAmount: 50000,
      paymentFrequency: 'monthly',
      status: 'active', // Important: Create as active
      terms: 'Test Lease'
    }, { headers });

    const leaseId = leaseRes.data.data.id;
    console.log(`Lease Created: ID ${leaseId}, Status: ${leaseRes.data.data.status}`);

    // Check Unit Status (Should be Occupied)
    const unitCheck1 = await axios.get(`${BASE_URL}/units/${unitId}`, { headers });
    console.log(`Unit Status after Lease Creation: ${unitCheck1.data.data.status}`);

    if (unitCheck1.data.data.status.toLowerCase() !== 'occupied') {
       throw new Error(`Expected status 'occupied', got '${unitCheck1.data.data.status}'`);
    }

    // 3. Terminate the Lease
    console.log('\n3. Terminating Lease...');
    const terminateRes = await axios.post(`${BASE_URL}/leases/${leaseId}/terminate`, {}, { headers });
    console.log(`Lease Terminated: Status ${terminateRes.data.data.status}`);

    // Check Unit Status (Should be Available)
    const unitCheck2 = await axios.get(`${BASE_URL}/units/${unitId}`, { headers });
    console.log(`Unit Status after Termination: ${unitCheck2.data.data.status}`);

    if (unitCheck2.data.data.status.toLowerCase() !== 'available') {
      throw new Error(`Expected status 'available', got '${unitCheck2.data.data.status}'`);
    }

    console.log('\n✅ Verification Successful: Unit status updated correctly throughout lifecycle.');

  } catch (error) {
    console.error('\n❌ Verification Failed:', error.message);
    console.error('Full Error:', error);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

verifyLifecycle();
