#!/usr/bin/env node

/**
 * Test script to check if project ID is needed in requests
 */

async function testFlowerWithProjectId() {
  const baseUrl = 'http://localhost:8000';
  
  console.log('Testing Flower AI with project ID...\n');
  
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
  
  // Test different request variations
  const testVariations = [
    {
      name: "With project_id in body",
      body: {
        model: "llama-3.1-70b-instruct",
        messages: [{ role: "user", content: "Hi" }],
        project_id: "35",
        encrypt: false,
        max_completion_tokens: 10
      }
    },
    {
      name: "With X-Flower-Project-ID header",
      headers: { "X-Flower-Project-ID": "35" },
      body: {
        model: "llama-3.1-70b-instruct",
        messages: [{ role: "user", content: "Hi" }],
        encrypt: false,
        max_completion_tokens: 10
      }
    },
    {
      name: "With default model from SDK",
      body: {
        model: "meta/llama3.2-1b/instruct-fp16",
        messages: [{ role: "user", content: "Hi" }],
        encrypt: false,
        max_completion_tokens: 10
      }
    },
    {
      name: "Without encryption flag",
      body: {
        model: "llama-3.1-70b-instruct",
        messages: [{ role: "user", content: "Hi" }],
        max_completion_tokens: 10
      }
    }
  ];
  
  for (const variation of testVariations) {
    console.log(`\n2. Testing: ${variation.name}`);
    try {
      const headers = { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(variation.headers || {})
      };
      
      const response = await fetch(`${baseUrl}/flower/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(variation.body)
      });
      
      console.log('  Status:', response.status);
      const data = await response.json();
      
      if (response.ok) {
        console.log('  ✓ Success!');
        console.log('  Response:', JSON.stringify(data, null, 2));
        break;
      } else {
        console.log('  ✗ Error:', JSON.stringify(data));
      }
    } catch (error) {
      console.error('  ✗ Failed:', error.message);
    }
  }
}

// Run the test
testFlowerWithProjectId().catch(console.error);