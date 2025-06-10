#!/usr/bin/env node

/**
 * Test script to find valid Flower AI model names
 */

async function testFlowerModels() {
  const baseUrl = 'http://localhost:8000';
  
  console.log('Testing Flower AI Model Names...\n');
  
  // First get an API key
  console.log('1. Getting API key...');
  let apiKey;
  try {
    const response = await fetch(`${baseUrl}/flower/api-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    apiKey = data.api_key;
    console.log('✓ API key obtained\n');
  } catch (error) {
    console.error('✗ API key test failed:', error.message);
    return;
  }
  
  // Test different model name formats
  const modelVariants = [
    // Working model
    "meta/llama3.2-1b/instruct-fp16",
    
    // Try similar formats for llama 3.1
    "meta/llama3.1-70b/instruct",
    "meta/llama3.1-70b/instruct-fp16",
    "meta/llama-3.1-70b/instruct",
    "meta/llama-3.1-70b-instruct",
    
    // Try without meta prefix
    "llama3.1-70b/instruct",
    "llama3.1-70b/instruct-fp16",
    
    // Try 8b variant
    "meta/llama3.1-8b/instruct",
    "meta/llama3.1-8b/instruct-fp16",
    "meta/llama3.2-3b/instruct-fp16",
    
    // Try other models
    "meta/llama-2-7b-chat",
    "meta/llama-2-13b-chat",
    "meta/llama-2-70b-chat"
  ];
  
  console.log('2. Testing model variants...\n');
  
  for (const model of modelVariants) {
    process.stdout.write(`Testing ${model.padEnd(40)} ... `);
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
          max_completion_tokens: 5
        })
      });
      
      if (response.ok) {
        console.log('✓ SUCCESS');
        const data = await response.json();
        if (data.choices && data.choices[0]) {
          console.log(`   Response: "${data.choices[0].message.content}"`);
        }
      } else {
        const error = await response.json();
        if (error.detail && error.detail.includes("50003")) {
          console.log('✗ Error 50003');
        } else {
          console.log(`✗ ${response.status}: ${JSON.stringify(error)}`);
        }
      }
    } catch (error) {
      console.log(`✗ Failed: ${error.message}`);
    }
  }
  
  console.log('\n3. Checking available models endpoint...');
  try {
    const response = await fetch(`${baseUrl}/flower/v1/models`, {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('\nAvailable models from API:');
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach(model => {
          console.log(`  - ${model.id}`);
        });
      }
    } else {
      console.log(`Models endpoint returned ${response.status}`);
    }
  } catch (error) {
    console.error('Models endpoint failed:', error.message);
  }
}

// Run the tests
testFlowerModels().catch(console.error);