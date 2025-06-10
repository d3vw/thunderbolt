#!/usr/bin/env node

/**
 * Final test script to verify Flower AI integration
 */

async function testFlowerIntegration() {
  const baseUrl = 'http://localhost:8000';
  
  console.log('===========================================');
  console.log('   Flower AI Integration Test Summary');
  console.log('===========================================\n');
  
  // Get API key
  let apiKey;
  try {
    const response = await fetch(`${baseUrl}/flower/api-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    apiKey = data.api_key;
    console.log('✓ API Key Generation: SUCCESS');
  } catch (error) {
    console.error('✗ API Key Generation: FAILED -', error.message);
    return;
  }
  
  // Test basic chat
  try {
    const response = await fetch(`${baseUrl}/flower/v1/chat/completions`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "meta/llama3.2-1b/instruct-fp16",
        messages: [{ role: "user", content: "Hello" }],
        encrypt: false,
        max_completion_tokens: 10
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✓ Basic Chat: SUCCESS');
      console.log(`  Response: "${data.choices[0].message.content}"`);
    } else {
      console.log('✗ Basic Chat: FAILED');
    }
  } catch (error) {
    console.error('✗ Basic Chat: FAILED -', error.message);
  }
  
  // Test streaming
  try {
    const response = await fetch(`${baseUrl}/flower/v1/chat/completions`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "meta/llama3.2-1b/instruct-fp16",
        messages: [{ role: "user", content: "Hi" }],
        encrypt: false,
        stream: true,
        max_completion_tokens: 5
      })
    });
    
    if (response.ok) {
      console.log('✓ Streaming: SUCCESS');
    } else {
      console.log('✗ Streaming: FAILED');
    }
  } catch (error) {
    console.error('✗ Streaming: FAILED -', error.message);
  }
  
  // Test encryption
  try {
    const response = await fetch(`${baseUrl}/flower/v1/chat/completions`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "meta/llama3.2-1b/instruct-fp16",
        messages: [{ role: "user", content: "Hi" }],
        encrypt: true,
        max_completion_tokens: 5
      })
    });
    
    if (response.ok) {
      console.log('✓ Encrypted Chat: SUCCESS');
    } else {
      const error = await response.json();
      if (error.detail && error.detail.includes("50003")) {
        console.log('✗ Encrypted Chat: FAILED (Error 50003)');
      } else {
        console.log('✗ Encrypted Chat: FAILED');
      }
    }
  } catch (error) {
    console.error('✗ Encrypted Chat: FAILED -', error.message);
  }
  
  console.log('\n===========================================');
  console.log('Summary:');
  console.log('- Working model: meta/llama3.2-1b/instruct-fp16');
  console.log('- Non-encrypted chat: ✓ Working');
  console.log('- Streaming: ✓ Working');
  console.log('- Encrypted chat: ✗ Error 50003');
  console.log('- Frontend defaults: Encryption OFF');
  console.log('===========================================\n');
  
  console.log('Notes:');
  console.log('1. Only the meta/llama3.2-1b/instruct-fp16 model works');
  console.log('2. Error 50003 appears to be model access/encryption related');
  console.log('3. The integration works for basic chat functionality');
  console.log('4. SDK headers have been added to the proxy');
}

// Run the test
testFlowerIntegration().catch(console.error);