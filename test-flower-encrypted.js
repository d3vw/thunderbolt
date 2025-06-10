#!/usr/bin/env node

/**
 * Test script to verify encrypted Flower AI chat
 */

async function testFlowerEncrypted() {
  const baseUrl = 'http://localhost:8000';
  
  console.log('Testing Flower AI Encrypted Chat...\n');
  
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
  
  // Test encrypted vs non-encrypted
  const tests = [
    {
      name: "Non-encrypted chat",
      encrypt: false
    },
    {
      name: "Encrypted chat",
      encrypt: true
    }
  ];
  
  for (const test of tests) {
    console.log(`\n2. Testing: ${test.name}`);
    console.log('================================');
    
    try {
      const startTime = Date.now();
      const response = await fetch(`${baseUrl}/flower/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "meta/llama3.2-1b/instruct-fp16",
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "What is 2+2? Just give the number." }
          ],
          encrypt: test.encrypt,
          max_completion_tokens: 20
        })
      });
      
      const duration = Date.now() - startTime;
      
      console.log(`Status: ${response.status}`);
      console.log(`Duration: ${duration}ms`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✓ Success!');
        if (data.choices && data.choices[0]) {
          console.log(`Response: "${data.choices[0].message.content}"`);
        }
        if (data.usage) {
          console.log(`Tokens: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`);
        }
      } else {
        const error = await response.json();
        console.log(`✗ Error: ${JSON.stringify(error)}`);
      }
    } catch (error) {
      console.log(`✗ Failed: ${error.message}`);
    }
  }
  
  // Test streaming
  console.log('\n\n3. Testing: Streaming (non-encrypted)');
  console.log('================================');
  
  try {
    const response = await fetch(`${baseUrl}/flower/v1/chat/completions`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "meta/llama3.2-1b/instruct-fp16",
        messages: [{ role: "user", content: "Count from 1 to 5" }],
        encrypt: false,
        stream: true,
        max_completion_tokens: 50
      })
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      console.log('✓ Streaming response:');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim() && line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              console.log('\n[Stream completed]');
            } else {
              try {
                const json = JSON.parse(data);
                if (json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content) {
                  process.stdout.write(json.choices[0].delta.content);
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }
    } else {
      const error = await response.text();
      console.log(`✗ Error: ${error}`);
    }
  } catch (error) {
    console.log(`✗ Failed: ${error.message}`);
  }
}

// Run the tests
testFlowerEncrypted().catch(console.error);