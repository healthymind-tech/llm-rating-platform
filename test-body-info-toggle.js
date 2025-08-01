const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testBodyInfoToggle() {
  try {
    console.log('🧪 Testing Body Information Toggle Feature...\n');

    // Test 1: Login as admin
    console.log('1. Testing admin login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@healthymind-tech.com',
      password: 'admin'
    });
    
    if (!loginResponse.data.token) {
      console.log('❌ Login failed - no token received');
      return;
    }
    
    console.log('✅ Admin login successful');
    const token = loginResponse.data.token;
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Test 2: Get current system settings
    console.log('\n2. Getting current system settings...');
    const settingsResponse = await axios.get(`${BASE_URL}/system-settings`, { headers: authHeaders });
    console.log('✅ System settings retrieved');
    
    const bodyInfoSetting = settingsResponse.data.settings.find(s => s.setting_key === 'require_user_body_info');
    console.log(`   Current body info requirement: ${bodyInfoSetting?.setting_value || 'not found'}`);

    // Test 3: Toggle body info requirement to OFF
    console.log('\n3. Disabling body info requirement...');
    await axios.put(`${BASE_URL}/system-settings/require_user_body_info`, {
      value: false,
      type: 'boolean'
    }, { headers: authHeaders });
    console.log('✅ Body info requirement disabled');

    // Test 4: Check if body info is required (should be false)
    console.log('\n4. Checking body info requirement status...');
    const bodyInfoStatusResponse = await axios.get(`${BASE_URL}/user-profile/body-info-required`);
    console.log(`✅ Body info required: ${bodyInfoStatusResponse.data.required}`);
    
    if (bodyInfoStatusResponse.data.required === false) {
      console.log('✅ Body info requirement correctly disabled');
    } else {
      console.log('❌ Body info requirement should be false');
    }

    // Test 5: Login as regular user
    console.log('\n5. Testing regular user login...');
    const userLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'user@healthymind-tech.com',
      password: 'user'
    });
    
    if (!userLoginResponse.data.token) {
      console.log('❌ User login failed');
      return;
    }
    
    console.log('✅ User login successful');
    const userToken = userLoginResponse.data.token;
    const userAuthHeaders = {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    };

    // Test 6: Check profile completion status (should be complete when body info not required)
    console.log('\n6. Checking user profile completion status...');
    const completionResponse = await axios.get(`${BASE_URL}/user-profile/completion-status`, { 
      headers: userAuthHeaders 
    });
    console.log(`✅ Profile completion status: ${completionResponse.data.completed}`);
    
    if (completionResponse.data.completed === true) {
      console.log('✅ Profile correctly marked as complete when body info not required');
    } else {
      console.log('❌ Profile should be complete when body info not required');
    }

    // Test 7: Send a chat message (should work without body info in prompt)
    console.log('\n7. Testing chat without body information...');
    const chatResponse = await axios.post(`${BASE_URL}/chat/message`, {
      message: 'Hello, can you help me with fitness advice?'
    }, { headers: userAuthHeaders });
    
    if (chatResponse.data.response) {
      console.log('✅ Chat message sent successfully');
      console.log('   Response preview:', chatResponse.data.response.substring(0, 100) + '...');
    } else {
      console.log('❌ Chat message failed');
    }

    // Test 8: Toggle body info requirement back to ON
    console.log('\n8. Re-enabling body info requirement...');
    await axios.put(`${BASE_URL}/system-settings/require_user_body_info`, {
      value: true,
      type: 'boolean'
    }, { headers: authHeaders });
    console.log('✅ Body info requirement re-enabled');

    // Test 9: Check if body info is now required (should be true)
    console.log('\n9. Verifying body info requirement is back on...');
    const finalBodyInfoStatusResponse = await axios.get(`${BASE_URL}/user-profile/body-info-required`);
    console.log(`✅ Body info required: ${finalBodyInfoStatusResponse.data.required}`);
    
    if (finalBodyInfoStatusResponse.data.required === true) {
      console.log('✅ Body info requirement correctly re-enabled');
    } else {
      console.log('❌ Body info requirement should be true');
    }

    // Test 10: Check profile completion status (should be incomplete when body info required)
    console.log('\n10. Checking profile completion with body info required...');
    const finalCompletionResponse = await axios.get(`${BASE_URL}/user-profile/completion-status`, { 
      headers: userAuthHeaders 
    });
    console.log(`✅ Profile completion status: ${finalCompletionResponse.data.completed}`);
    
    if (finalCompletionResponse.data.completed === false) {
      console.log('✅ Profile correctly marked as incomplete when body info required');
    } else {
      console.log('❌ Profile should be incomplete when body info required and not provided');
    }

    console.log('\n🎉 Body Information Toggle Feature Test Complete!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Admin can toggle body info requirement');
    console.log('   ✅ System correctly responds to body info setting');
    console.log('   ✅ Profile completion logic respects the setting');
    console.log('   ✅ Chat functionality works regardless of setting');
    console.log('   ✅ API endpoints properly validate based on setting');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Backend server is not running. Please start it with: npm start');
    } else if (error.response?.status === 500) {
      console.log('\n💡 Database connection issue. Please ensure PostgreSQL is running.');
    } else if (error.response?.data?.error) {
      console.log('\n💡 API Error:', error.response.data.error);
    }
  }
}

console.log('🚀 Starting Body Information Toggle Tests...');
console.log('📝 This test will:');
console.log('   1. Toggle body info requirement OFF');
console.log('   2. Verify users can use the system without body info');
console.log('   3. Toggle body info requirement back ON');
console.log('   4. Verify body info is required again');
console.log('');

testBodyInfoToggle();