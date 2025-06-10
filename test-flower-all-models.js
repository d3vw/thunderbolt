#!/usr/bin/env node

/**
 * Test script to find all working Flower AI models
 */

async function testAllFlowerModels() {
  const baseUrl = 'http://localhost:8000';
  
  console.log('Testing all possible Flower AI models...\n');
  
  // Get API key
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
  
  // Test comprehensive list of models
  const models = [
    // Known working
    "meta/llama3.2-1b/instruct-fp16",
    
    // Llama 3.2 variants
    "meta/llama3.2-1b/instruct",
    "meta/llama3.2-1b/instruct-q4",
    "meta/llama3.2-1b/instruct-q8",
    "meta/llama3.2-3b/instruct",
    "meta/llama3.2-3b/instruct-fp16",
    "meta/llama3.2-3b/instruct-q4",
    "meta/llama3.2-3b/instruct-q8",
    
    // Llama 3.1 variants
    "meta/llama3.1-8b/instruct",
    "meta/llama3.1-8b/instruct-fp16",
    "meta/llama3.1-8b/instruct-q4",
    "meta/llama3.1-8b/instruct-q8",
    
    // Llama 3 variants
    "meta/llama3-8b/instruct",
    "meta/llama3-8b/instruct-fp16",
    "meta/llama3-8b/instruct-q4",
    
    // Other potential models
    "meta/codellama-7b/instruct",
    "meta/codellama-13b/instruct",
    
    // Mistral variants
    "mistral-7b-instruct",
    "mistral/mistral-7b-instruct",
    
    // Phi variants
    "microsoft/phi-2",
    "microsoft/phi-3-mini",
    
    // Gemma variants
    "google/gemma-2b",
    "google/gemma-7b"
  ];
  
  console.log('Testing models...\n');
  const workingModels = [];
  
  for (const model of models) {
    process.stdout.write(`${model.padEnd(40)} ... `);
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
        console.log('✓ WORKING');
        workingModels.push(model);
      } else {
        const error = await response.json();
        if (error.detail && error.detail.includes("50003")) {
          console.log('✗ Error 50003');
        } else {
          console.log(`✗ Error ${response.status}`);
        }
      }
    } catch (error) {
      console.log(`✗ Failed: ${error.message}`);
    }
  }
  
  console.log('\n\nSummary:');
  console.log('==========');
  if (workingModels.length > 0) {
    console.log(`Found ${workingModels.length} working model(s):`);
    workingModels.forEach(model => console.log(`  ✓ ${model}`));
  } else {
    console.log('No additional working models found.');
  }
}

// Run the test
testAllFlowerModels().catch(console.error);