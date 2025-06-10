#!/usr/bin/env node

/**
 * Test script to check available Flower AI models
 */

async function testFlowerModels() {
  const baseUrl = 'http://localhost:8000';
  
  console.log('Testing Flower AI Models...\n');
  
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
  
  // Test 2: Try to get models list
  console.log('\n2. Testing models endpoint...');
  try {
    const response = await fetch(`${baseUrl}/flower/v1/models`, {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Response:', text);
    
    if (response.ok) {
      try {
        const data = JSON.parse(text);
        console.log('\nAvailable models:');
        if (data.data && Array.isArray(data.data)) {
          data.data.forEach(model => {
            console.log(`- ${model.id}`);
          });
        }
      } catch (e) {
        console.log('Could not parse as JSON');
      }
    }
  } catch (error) {
    console.error('✗ Models test failed:', error.message);
  }
  
  // Test 3: Try a simple non-encrypted chat
  console.log('\n3. Testing simple chat (no encryption)...');
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
        encrypt: false
      })
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('✗ Chat test failed:', error.message);
  }
  
  // Test 4: Try different model names
  console.log('\n4. Testing different model names...');
  const modelVariants = [
    "llama-3.1-70b-instruct",
    "meta/llama-3.1-70b-instruct",
    "accounts/flower/models/llama-3.1-70b-instruct",
    "llama3.1-70b-instruct",
    "llama-3-70b-instruct"
  ];
  
  for (const model of modelVariants) {
    console.log(`\nTrying model: ${model}`);
    try {
      const response = await fetch(`${baseUrl}/flower/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: "Hi" }],
          encrypt: false,
          max_tokens: 10
        })
      });
      
      console.log(`  Status: ${response.status}`);
      if (!response.ok) {
        const error = await response.json();
        console.log(`  Error: ${JSON.stringify(error)}`);
      } else {
        console.log(`  ✓ Success!`);
        const data = await response.json();
        if (data.choices && data.choices[0]) {
          console.log(`  Response: ${data.choices[0].message.content}`);
        }
      }
    } catch (error) {
      console.error(`  ✗ Failed: ${error.message}`);
    }
  }
}

// Run the tests
testFlowerModels().catch(console.error);