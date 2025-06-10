#!/usr/bin/env node

/**
 * Test script to check if SDK headers fix the Flower AI error
 */

async function testFlowerWithHeaders() {
  const baseUrl = 'http://localhost:8000';
  
  console.log('Testing Flower AI with SDK headers...\n');
  
  // First get an API key
  console.log('1. Getting API key...');
  let apiKey;
  try {
    const response = await fetch(`${baseUrl}/flower/api-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    apiKey = data.api_key;
    console.log('✓ API key obtained:', apiKey ? apiKey.substring(0, 10) + '...' : 'N/A');
  } catch (error) {
    console.error('✗ API key test failed:', error.message);
    return;
  }
  
  // Test chat completion with SDK headers
  console.log('\n2. Testing chat completion with SDK headers...');
  try {
    const response = await fetch(`${baseUrl}/flower/v1/chat/completions`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-instruct",
        messages: [{ role: "user", content: "Say hello" }],
        encrypt: false,
        max_completion_tokens: 10
      })
    });
    
    console.log('Response status:', response.status);
    const headers = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('Response headers:', headers);
    
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✓ Success! The SDK headers fixed the issue.');
    } else {
      console.log('\n✗ Still getting error with SDK headers.');
    }
  } catch (error) {
    console.error('✗ Chat test failed:', error.message);
  }
}

// Run the test
testFlowerWithHeaders().catch(console.error);