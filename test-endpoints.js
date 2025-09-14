const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testEndpoints() {
  try {
    console.log('🧪 Testing LLM Configuration Endpoints...\n');

    // Test 1: Login to get admin token
    console.log('1. Testing admin login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'password'
    });
    
    if (loginResponse.data.token) {
      console.log('✅ Login successful');
      const token = loginResponse.data.token;
      
      const authHeaders = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Test 2: Fetch models endpoint (should fail with invalid API key)
      console.log('\n2. Testing fetch-models endpoint...');
      try {
        const modelsResponse = await axios.post(`${BASE_URL}/config/fetch-models`, {
          api_key: 'invalid-key',
          endpoint: 'https://api.openai.com/v1'
        }, { headers: authHeaders });
        console.log('❌ Should have failed with invalid API key');
      } catch (error) {
        if (error.response?.status === 500 && error.response?.data?.error?.includes('Invalid API key')) {
          console.log('✅ fetch-models endpoint working (correctly rejected invalid API key)');
        } else {
          console.log('⚠️  Unexpected error:', error.response?.data?.error || error.message);
        }
      }

      // Test 3: Test config endpoint
      console.log('\n3. Testing test-config endpoint...');
      try {
        const testResponse = await axios.post(`${BASE_URL}/config/test-config`, {
          type: 'openai',
          model: 'gpt-3.5-turbo',
          temperature: 1,
          max_tokens: 150
        }, { headers: authHeaders });
        
        if (testResponse.data.success) {
          console.log('✅ test-config endpoint working (demo mode)');
          console.log('   Response:', testResponse.data.response);
        }
      } catch (error) {
        console.log('❌ test-config failed:', error.response?.data?.error || error.message);
      }

    } else {
      console.log('❌ Login failed - no token received');
    }

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Backend server is not running. Please start it with: npm start');
    } else if (error.response?.status === 500) {
      console.log('\n💡 Database connection issue. Please ensure PostgreSQL is running.');
    }
  }
}

testEndpoints();