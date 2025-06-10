# Flower AI Integration

This document describes the Flower AI integration added to Thunderbolt.

## Overview

Flower AI has been integrated as a new provider option that offers privacy-first AI with end-to-end encryption and secure attestation. The integration includes both backend and frontend components.

## Backend Integration

### Configuration

Add the following environment variables to your backend `.env` file:

```bash
FLOWER_MGMT_KEY=your_flower_management_key
FLOWER_PROJ_ID=your_flower_project_id
```

### Components

1. **flower_auth.py** - Handles Flower API key generation and management
2. **Backend proxy** - Proxies requests to Flower AI API with dynamic API key injection
3. **API endpoints**:
   - `POST /flower/api-key` - Get a Flower API key for the current user
   - `/flower/*` - Proxy endpoint for Flower AI API calls

## Frontend Integration

### Components

1. **src/lib/flower.ts** - Flower AI utility functions and API integration
2. **src/chats/flower-chat.tsx** - Specialized chat component with encryption and attestation UI
3. **src/chats/flower-detail.tsx** - Chat detail page for Flower AI conversations

### Features

- **End-to-end encryption** - Toggle encryption on/off for messages
- **Secure attestation** - Visual indicators for connection security status
- **Privacy-first UI** - Clear indicators when encryption is enabled
- **Dedicated chat interface** - Separate from regular chat with Flower AI branding

### Models

The following Flower AI models are seeded by default:

- Llama 3.1 70B Instruct
- Llama 3.1 8B Instruct

## Usage

1. **Start a new Flower AI chat** - Click "New Flower Chat" in the sidebar
2. **Encryption toggle** - Use the encryption checkbox in the chat header
3. **Security status** - Monitor the attestation status indicator
4. **Model selection** - Flower AI models are available in the model settings

## Routes

- `/flower/:chatThreadId` - Flower AI chat interface

## Dependencies

### Backend

- `requests>=2.32.0` - For Flower API communication

### Frontend

- `@flwr/flwr@^0.1.8` - Flower Intelligence JavaScript library

## Security Features

- Dynamic API key generation per user session
- End-to-end encryption for sensitive conversations
- Secure attestation verification
- Privacy-focused UI indicators

## Configuration Notes

- Flower AI models are marked as non-system models by default
- Chat titles for Flower AI conversations are prefixed with 🌸
- The integration uses the latest Flower Intelligence module from unpkg
- API keys are generated dynamically and not stored permanently
