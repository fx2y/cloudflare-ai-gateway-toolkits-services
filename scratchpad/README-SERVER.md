# Cloudflare AI Gateway Proxy Server

## Overview

This is the proxy server component of the Cloudflare AI Gateway toolkit. It acts as a request proxy that forwards AI provider requests through configured gateways, providing authentication, caching, and provider-specific adaptations.

## Architecture

The proxy server consists of several key components:

### Core Components

1. **GatewayConfigService** - Manages gateway configurations with in-memory caching
2. **ProxyServer** - Main request handler and routing logic
3. **Provider Adapters** - Handle provider-specific URL construction and header transformation
4. **Authentication Middleware** - Validates cf-aig-authorization headers

### Provider Support

- **OpenAI** - Standard proxy with header forwarding
- **Anthropic** - Standard proxy with header forwarding  
- **Azure OpenAI** - Custom URL format and api-key header transformation
- **AWS Bedrock** - Preserves AWS v4 signed headers
- **Workers AI** - Cloudflare's AI platform
- **Google AI Studio** - Google's AI services
- **Hugging Face** - Inference API
- **Cohere** - Cohere API

## URL Pattern

The proxy accepts requests with the following pattern:

```
POST /v1/{accountId}/{gatewayId}/{providerName}/{providerPath}
```

Examples:
- `/v1/abc123/my-gateway/openai/chat/completions`
- `/v1/abc123/my-gateway/azure-openai/myresource/gpt-35-turbo/chat/completions`
- `/v1/abc123/my-gateway/aws-bedrock/us-east-1/model/anthropic.claude-v2/invoke`

## Environment Variables

```bash
CF_API_TOKEN=your_cloudflare_api_token
CF_ACCOUNT_ID=your_cloudflare_account_id
PORT=3000
```

## Running the Server

### Development Mode
```bash
npm run dev:server
```

### Production Mode
```bash
npm run build
npm run start:server
```

## Authentication

When a gateway has authentication enabled (collect_logs: true), requests must include:

```
cf-aig-authorization: Bearer your_gateway_token
```

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests  
```bash
npm run test:integration
```

## Example Usage

### Basic OpenAI Request
```bash
curl -X POST http://localhost:3000/v1/account123/my-gateway/openai/chat/completions \
  -H "Authorization: Bearer sk-your-openai-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Azure OpenAI Request
```bash
curl -X POST http://localhost:3000/v1/account123/my-gateway/azure-openai/myresource/gpt-35-turbo/chat/completions \
  -H "Authorization: Bearer your-azure-key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello Azure!"}]
  }'
```

### With Gateway Authentication
```bash
curl -X POST http://localhost:3000/v1/account123/secure-gateway/openai/chat/completions \
  -H "Authorization: Bearer sk-your-openai-key" \
  -H "cf-aig-authorization: Bearer gateway-access-token" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo", 
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Health Check

```bash
curl http://localhost:3000/health
```

## Implementation Status

✅ **Completed Components:**
- Gateway configuration service with caching
- Request routing and proxy middleware  
- Provider adapters (Default, Azure, Bedrock)
- Authentication middleware
- Comprehensive test suite
- Error handling and logging

✅ **Provider Support:**
- OpenAI, Anthropic, Workers AI, Google AI Studio
- Azure OpenAI with custom URL format and api-key headers
- AWS Bedrock with AWS v4 header preservation
- Hugging Face and Cohere

✅ **Testing:**
- Unit tests for all components
- Integration tests with mocked providers
- Error handling scenarios
- Authentication flow validation

## Next Steps

- Add rate limiting based on gateway configuration
- Implement request/response logging and analytics  
- Add metrics and monitoring endpoints
- Performance optimization and load testing
- Production deployment configuration 