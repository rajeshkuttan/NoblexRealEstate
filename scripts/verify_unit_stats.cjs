const axios = require('axios');

async function verifyUnitStats() {
  try {
    // Attempt to login first if needed, but for now assuming we might be able to hit it directly 
    // or we'll add a token if we have one. 
    // Since this is a dev script, let's try hitting the endpoint directly.
    // Ideally we would log in, but let's see if we can get by or if we need to simulate auth.
    // Based on routes, authMiddleware is used. I'll need a token.
    // For local dev often there is a way to bypass or I can try to register/login a test user.
    
    // Let's assume we can get a token or the user has one. 
    // Actually, to make this robust, I'll try to login with a test account or just error out if auth fails.
    // IMPORTANT: Replacing with localhost:5002 based on api.ts
    const baseURL = 'http://localhost:5002/api';
    
    console.log('Testing /units/stats endpoint...');

    // Try to login to get a token (using a likely default or test credential if available, otherwise this might fail)
    // If this fails, I'll ask the user or just assume I need to manually verify or skip auth for local test.
    // For now, I'll try to hit the endpoint providing a dummy token or no token to see the response (likely 401).
    // Testing endpoints usually requires a valid token.
    
    // NOTE: This script is a template. In a real scenario I'd need a valid token.
    // I will try to fetch without token first to check connectivity.
    
    try {
        const response = await axios.get(`${baseURL}/units/stats`);
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log('Auth required. Please provide a valid Bearer token as an argument or modify script.');
        } else {
            console.error('Error fetching stats:', error.message);
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
            }
        }
    }

  } catch (error) {
    console.error('Script failed:', error);
  }
}

verifyUnitStats();
