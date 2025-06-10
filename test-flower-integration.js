#!/usr/bin/env node

/**
 * Test script to verify Flower AI integration works end-to-end
 * Run with: node test-flower-integration.js
 */

async function testFlowerIntegration() {
  const baseUrl = 'http://localhost:8000';
  
  console.log('Testing Flower AI Integration...\n');
  
  // Test 1: Get API key
  console.log('1. Testing API key endpoint...');
  try {
    const response = await fetch(`${baseUrl}/flower/api-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✓ API key obtained:', data.api_key ? 'Yes' : 'No');
    console.log('  Key format:', data.api_key ? data.api_key.substring(0, 10) + '...' : 'N/A');
  } catch (error) {
    console.error('✗ API key test failed:', error.message);
  }
  
  // Test 2: Test public endpoint (server public key)
  console.log('\n2. Testing public endpoint (no auth required)...');
  try {
    const response = await fetch(`${baseUrl}/flower/v1/encryption/server-public-key`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✓ Server public key obtained:', data.public_key_base64 ? 'Yes' : 'No');
  } catch (error) {
    console.error('✗ Public endpoint test failed:', error.message);
  }
  
  // Test 3: Test OPTIONS request (CORS preflight)
  console.log('\n3. Testing CORS preflight...');
  try {
    const response = await fetch(`${baseUrl}/flower/v1/chat/completions`, {
      method: 'OPTIONS'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log('✓ CORS preflight passed');
  } catch (error) {
    console.error('✗ CORS preflight test failed:', error.message);
  }
  
  // Test 4: Test health endpoint
  console.log('\n4. Testing backend health...');
  try {
    const response = await fetch(`${baseUrl}/health`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✓ Backend health:', data.status);
  } catch (error) {
    console.error('✗ Health check failed:', error.message);
  }
  
  console.log('\nIntegration tests completed!');
}

// Run the tests
testFlowerIntegration().catch(console.error);