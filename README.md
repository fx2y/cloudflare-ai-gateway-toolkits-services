# Cloudflare AI Gateway Management Client

A TypeScript client library for managing Cloudflare AI Gateway resources. This library provides a simple, type-safe interface for creating, reading, updating, and deleting AI Gateways through the Cloudflare API.

## Features

- ✅ **Full CRUD Operations** - Create, read, update, and delete AI Gateways
- ✅ **TypeScript Support** - Fully typed with comprehensive interfaces
- ✅ **Robust Error Handling** - Custom error classes with detailed API error information
- ✅ **Input Validation** - Client-side validation before API calls
- ✅ **Comprehensive Testing** - Unit tests with API mocking and optional integration tests
- ✅ **Modern Architecture** - Built with axios, supports Node.js 16+

## Installation

```bash
npm install cloudflare-ai-gateway-client
```

## Quick Start

```typescript
import { GatewayClient } from 'cloudflare-ai-gateway-client';

// Initialize the client
const client = new GatewayClient({
  apiToken: 'your-cloudflare-api-token',
  accountId: 'your-cloudflare-account-id',
});

// Create a new AI Gateway
const gateway = await client.createGateway({
  name: 'my-ai-gateway',
  cache_ttl: 300,
  collect_logs: true,
});

console.log('Created gateway:', gateway.id);
```

## Authentication

You need a Cloudflare API token with the following permissions:
- `AI Gateway:Read`
- `AI Gateway:Edit`

Create an API token at [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens).

## API Reference

### Client Configuration

```typescript
interface BaseClientConfig {
  apiToken: string;      // Required: Your Cloudflare API token
  accountId: string;     // Required: Your Cloudflare account ID
  baseURL?: string;      // Optional: API base URL (defaults to Cloudflare production)
  timeout?: number;      // Optional: Request timeout in ms (defaults to 10000)
}
```

### Gateway Operations

#### Create Gateway

```typescript
const gateway = await client.createGateway({
  name: 'gateway-name',           // Required: max 64 characters
  cache_ttl?: 300,                // Optional: cache TTL in seconds (default: 0)
  collect_logs?: true,            // Optional: whether to collect logs (default: true)
  rate_limiting_limit?: 1000,     // Optional: requests per interval
  rate_limiting_interval?: 60,    // Optional: interval in seconds
  rate_limiting_technique?: 'fixed' // Optional: 'fixed' or 'sliding'
});
```

**Note**: When using rate limiting, you must specify `limit`, `interval`, and `technique` together.

#### List Gateways

```typescript
const gateways = await client.listGateways();
console.log(`Found ${gateways.length} gateways`);
```

#### Get Gateway

```typescript
const gateway = await client.getGateway('gateway-id');
console.log('Gateway name:', gateway.name);
```

#### Update Gateway

```typescript
const updatedGateway = await client.updateGateway('gateway-id', {
  name: 'new-name',
  cache_ttl: 600,
});
```

#### Delete Gateway

```typescript
await client.deleteGateway('gateway-id');
console.log('Gateway deleted successfully');
```

## Error Handling

The client uses a custom `CloudflareAPIError` class that provides detailed error information:

```typescript
import { CloudflareAPIError } from 'cloudflare-ai-gateway-client';

try {
  await client.createGateway({ name: '' }); // Invalid: empty name
} catch (error) {
  if (error instanceof CloudflareAPIError) {
    console.log('Status:', error.statusCode);
    console.log('Message:', error.message);
    console.log('API Errors:', error.apiErrors);
    console.log('Detailed:', error.getDetailedMessage());
  }
}
```

## TypeScript Types

### Core Interfaces

```typescript
interface AIGateway {
  readonly id: string;
  name: string;
  readonly created_on: string;
  readonly modified_on: string;
  cache_ttl: number;
  collect_logs: boolean;
  rate_limiting_limit: number | null;
  rate_limiting_interval: number | null;
  rate_limiting_technique: 'fixed' | 'sliding' | null;
}

type CreateGatewayPayload = Pick<AIGateway, 'name'> & 
  Partial<Pick<AIGateway, 'cache_ttl' | 'collect_logs' | 'rate_limiting_limit' | 'rate_limiting_interval' | 'rate_limiting_technique'>>;

type UpdateGatewayPayload = Partial<CreateGatewayPayload>;
```

## Examples

### Basic Gateway Management

```typescript
import { GatewayClient, CloudflareAPIError } from 'cloudflare-ai-gateway-client';

async function manageGateways() {
  const client = new GatewayClient({
    apiToken: process.env.CF_API_TOKEN!,
    accountId: process.env.CF_ACCOUNT_ID!,
  });

  try {
    // Create a gateway with caching
    const gateway = await client.createGateway({
      name: 'production-gateway',
      cache_ttl: 3600, // 1 hour cache
      collect_logs: true,
    });

    console.log(`Created gateway: ${gateway.id}`);

    // List all gateways
    const allGateways = await client.listGateways();
    console.log(`Total gateways: ${allGateways.length}`);

    // Update the gateway
    const updated = await client.updateGateway(gateway.id, {
      cache_ttl: 7200, // 2 hours
    });

    console.log(`Updated cache TTL to: ${updated.cache_ttl}`);

    // Clean up
    await client.deleteGateway(gateway.id);
    console.log('Gateway deleted');

  } catch (error) {
    if (error instanceof CloudflareAPIError) {
      console.error('API Error:', error.getDetailedMessage());
    } else {
      console.error('Unexpected error:', error);
    }
  }
}
```

### Gateway with Rate Limiting

```typescript
async function createRateLimitedGateway() {
  const client = new GatewayClient({
    apiToken: process.env.CF_API_TOKEN!,
    accountId: process.env.CF_ACCOUNT_ID!,
  });

  const gateway = await client.createGateway({
    name: 'rate-limited-gateway',
    rate_limiting_limit: 1000,      // 1000 requests
    rate_limiting_interval: 60,     // per minute
    rate_limiting_technique: 'fixed', // fixed window
  });

  console.log('Created rate-limited gateway:', gateway.id);
}
```

## Development

### Running Tests

```bash
# Unit tests (with mocking)
npm test

# Integration tests (requires real API credentials)
cp env.example .env
# Edit .env with your credentials
npm run test:integration

# Coverage report
npm run test:coverage
```

### Building

```bash
npm run build
```

### Linting and Formatting

```bash
npm run lint
npm run format
```

## Environment Variables

For integration tests, create a `.env` file:

```bash
CF_API_TOKEN=your-api-token-here
CF_ACCOUNT_ID=your-account-id-here
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- [Cloudflare AI Gateway Documentation](https://developers.cloudflare.com/ai-gateway/)
- [Cloudflare API Documentation](https://developers.cloudflare.com/api/)
- [Issues](https://github.com/cloudflare/ai-gateway-client/issues)

## Changelog

### v1.0.0
- Initial release
- Full CRUD operations for AI Gateways
- TypeScript support with comprehensive types
- Robust error handling with custom error classes
- Input validation and rate limiting support
- Comprehensive test coverage (unit and integration) 