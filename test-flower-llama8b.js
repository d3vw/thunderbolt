#!/usr/bin/env node

/**
 * Test script to check if meta/llama3.1-8b/instruct-q4 works with Flower AI
 */

async function testFlowerLlama8b() {
  const baseUrl = 'http://localhost:8000';
  
  console.log('Testing Flower AI with meta/llama3.1-8b/instruct-q4...\n');
  
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
  
  // Test the specific model
  console.log('2. Testing meta/llama3.1-8b/instruct-q4...');
  try {
    const response = await fetch(`${baseUrl}/flower/v1/chat/completions`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "meta/llama3.1-8b/instruct-q4",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "What is 2+2? Just give the number." }
        ],
        encrypt: false,
        max_completion_tokens: 10
      })
    });
    
    console.log('Response status:', response.status);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✓ Success!');
      if (data.choices && data.choices[0]) {
        console.log(`Response: "${data.choices[0].message.content}"`);
      }
      console.log('\nFull response:', JSON.stringify(data, null, 2));
    } else {
      console.log('✗ Error:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('✗ Test failed:', error.message);
  }
  
  // Also test some variations
  console.log('\n3. Testing model variations...');
  const variations = [
    "meta/llama3.1-8b/instruct-q4",
    "meta/llama-3.1-8b-instruct-q4",
    "meta/llama3.1-8b-instruct-q4",
    "llama3.1-8b/instruct-q4"
  ];
  
  for (const model of variations) {
    process.stdout.write(`  ${model.padEnd(35)} ... `);
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
      } else {
        const error = await response.json();
        if (error.detail && error.detail.includes("50003")) {
          console.log('✗ Error 50003');
        } else {
          console.log(`✗ ${response.status}`);
        }
      }
    } catch (error) {
      console.log(`✗ Failed: ${error.message}`);
    }
  }
}

// Run the test
testFlowerLlama8b().catch(console.error);