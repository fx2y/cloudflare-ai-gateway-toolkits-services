# Cloudflare AI Gateway Toolkits & Services

[![Build Status](https://img.shields.io/github/actions/workflow/status/fx2y/cloudflare-ai-gateway-toolkits-services/ci.yml?branch=main)](https://github.com/fx2y/cloudflare-ai-gateway-toolkits-services/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/@cloudflare-ai-gateway/client.svg)](https://www.npmjs.com/package/@cloudflare-ai-gateway/client)

**Cloudflare AI Gateway Toolkits & Services** is a production-ready, open-source gateway designed to streamline interactions with large language models (LLMs) and other AI APIs. It acts as a single, intelligent entry point for all your AI traffic, providing the essential tools to build robust, scalable, and observable AI-powered applications.

Stop managing a chaotic web of SDKs and API keys. With Cloudflare AI Gateway Toolkits & Services, you gain a unified control plane to manage costs, enhance performance, and improve the resilience of your entire AI stack.

---

## Key Features

This project is built on a powerful middleware architecture, giving you granular control over every request.

*   **⚡ Unified API Access**: Interact with any supported AI provider (OpenAI, Anthropic, Google Gemini, Cohere, Workers AI, etc.) through a single, consistent endpoint.
    *   **OpenAI-Compatible Endpoint**: Use the standard OpenAI SDK to call non-OpenAI models like Claude 3 or Gemini 2.0 without changing your application code.
    *   **Universal Endpoint & Cross-Provider Fallbacks**: Define a chain of providers (e.g., try Workers AI, fall back to OpenAI if it fails or times out). The gateway automatically handles the routing, making your application incredibly resilient.

*   **💰 Cost Management & Performance**:
    *   **Intelligent Caching**: Automatically cache identical requests to reduce latency and slash provider costs. A single `Cache-Control` header can save you thousands.
    *   **Deep Analytics & Cost Tracking**: Get immediate visibility into token usage, request latency, error rates, and estimated costs per-model, per-provider, or per-user.

*   **🛡️ Robustness & Control**:
    *   **Dynamic Rate Limiting**: Protect your application from abuse and prevent surprise bills with configurable fixed or sliding-window rate limits.
    *   **Automatic Retries & Timeouts**: Automatically retry failed requests with configurable exponential backoff. Set per-request timeouts to prevent your application from hanging on slow provider responses.
    *   **Custom Metadata**: Tag requests with user IDs, session IDs, or A/B test variants for granular analysis and filtering in your logs.

*   **🔐 Application Security**:
    *   **Gateway Authentication**: Secure your gateway with API tokens to prevent unauthorized access.
    *   **Guardrails (Content Moderation)**: Proactively scan user prompts and model responses for harmful content, with configurable policies to `Block`, `Flag`, or `Ignore` violations.

*   **🔧 Superior Developer Experience**:
    *   **Client-Side SDK (`@cloudflare-ai-gateway/client`)**: A lightweight Node.js library that mirrors the ergonomics of modern AI bindings for seamless integration.
    *   **Declarative Configuration**: Manage all features via a simple REST API or through per-request HTTP headers, giving you ultimate flexibility.

---

## How It Works

The Cloudflare AI Gateway Toolkits & Services project provides components that sit between your application and the various AI providers. Every request you send passes through a pipeline of middleware, which applies your configured rules before forwarding it to the final destination.

`Your App -> CF AI Gateway Service -> [Auth -> Cache -> Rate Limit -> Guardrails -> Retry Logic] -> AI Provider`

This architecture allows for powerful, composable control over your entire AI infrastructure.

---

## Quick Start

The easiest way to get started is with Docker. This will launch the Gateway service and a Redis instance for caching.

1.  **Create a `docker-compose.yml` file:**

    ```yaml
    version: '3.8'
    services:
      redis:
        image: redis:7-alpine
        command: redis-server --save 60 1 --loglevel warning
        volumes:
          - redis_data:/data
    
      cloudflare-ai-gateway-service:
        image: fx2y/cloudflare-ai-gateway-toolkits-services:latest # Replace with the actual image path
        ports:
          - "8080:8080"
        environment:
          # Required: Point to your Redis instance
          - REDIS_URL=redis://redis:6379
          # Required: Credentials for managing gateways via the API
          - CF_AIG_MANAGEMENT_API_TOKEN=your-secure-admin-token
        depends_on:
          - redis

    volumes:
      redis_data:
    ```

2.  **Run Docker Compose:**
    ```bash
    docker-compose up -d
    ```

3.  **Create your first Gateway:**
    Use the Gateway Management API to create a gateway.

    ```bash
    curl -X POST http://localhost:8080/api/management/gateways \
      -H "Authorization: Bearer your-secure-admin-token" \
      -H "Content-Type: application/json" \
      -d '{ "id": "my-first-gateway", "name": "Primary App Gateway" }'
    ```

4.  **Make your first proxied AI request!**
    Simply replace the provider's base URL with your Cloudflare AI Gateway endpoint.

    ```bash
    curl https://api.openai.com/v1/chat/completions \
      -H "Authorization: Bearer $OPENAI_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{ "model": "gpt-4o-mini", "messages": [{"role":"user","content":"What is an AI Gateway?"}] }'

    # Becomes:
    curl http://localhost:8080/v1/default/my-first-gateway/openai/chat/completions \
      -H "Authorization: Bearer $OPENAI_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{ "model": "gpt-4o-mini", "messages": [{"role":"user","content":"What is an AI Gateway?"}] }'
    ```

You now have a fully observable and controllable AI endpoint!

---

## Usage & Features in Depth

Control the Cloudflare AI Gateway's features by sending standard HTTP headers with your requests.

### 1. Unified Provider Access

#### Basic Proxy (Direct)
This is the simplest usage, as shown in the Quick Start.
`http://.../{gateway_id}/{provider_name}/{original_provider_path}`

#### **OpenAI-Compatible Endpoint**
Use the OpenAI SDK to talk to Anthropic, Gemini, and more. Just change the `model` parameter.

```bash
# This request is sent to Anthropic's Claude 3 Haiku, but uses the OpenAI API schema.
curl http://localhost:8080/v1/default/my-first-gateway/compat/chat/completions \
  -H "Authorization: Bearer $ANTHROPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "anthropic/claude-3-haiku-20240307",
    "messages": [{"role": "user", "content": "Explain the significance of the Universal Endpoint."}]
  }'
```

#### **Universal Endpoint with Cross-Provider Fallbacks**
The killer feature. Define a chain of providers to execute in order. If the first fails, the gateway automatically tries the next.

```bash
# Tries Workers AI first. If it fails or times out, it seamlessly falls back to OpenAI.
curl http://localhost:8080/v1/default/my-first-gateway \
  -H "Content-Type: application/json" \
  -d '[
    {
      "provider": "workers-ai",
      "endpoint": "@cf/meta/llama-3.1-8b-instruct",
      "headers": { "Authorization": "Bearer $CLOUDFLARE_API_KEY" },
      "query": { "prompt": "Tell a short story." }
    },
    {
      "provider": "openai",
      "endpoint": "chat/completions",
      "headers": { "Authorization": "Bearer $OPENAI_API_KEY" },
      "query": {
        "model": "gpt-4o-mini",
        "messages": [{"role": "user", "content": "Tell a short story."}]
      }
    }
  ]'
```
The response will include a header `cf-aig-step: 1` to indicate the fallback was used.

### 2. Caching & Cost Reduction
Cache a response for 1 hour (3600 seconds). Subsequent identical requests will hit the cache, saving money and responding instantly.

```bash
curl ... \
  -H "cf-aig-cache-ttl: 3600" \
  -d '{ ... }'

# The response will contain `cf-aig-cache-status: HIT` on the second request.
```

### 3. Resilience (Retries & Timeouts)
Make your requests more robust. This example will retry up to 3 times on failure, waiting 2 seconds between retries, and will time out if the provider takes longer than 5 seconds to respond.

```bash
curl ... \
  -H "cf-aig-max-attempts: 3" \
  -H "cf-aig-retry-delay: 2000" \
  -H "cf-aig-request-timeout: 5000" \
  -d '{ ... }'
```

### 4. Observability (Logging & Metadata)
Tag requests with your internal identifiers for easy filtering and analysis. The response will contain a unique log ID for feedback loops.

```bash
curl ... \
  -H 'cf-aig-metadata: {"user_id": "usr_abc123", "ab_test_group": "A"}' \
  -d '{ ... }'

# The response headers will include `cf-aig-log-id: 123e4567-e89b-12d3-a456-426614174000`
```

---

## Client-Side SDK (`@cloudflare-ai-gateway/client`)

For Node.js applications, we provide a lightweight client library for an even better developer experience.

```typescript
import { AIGatewayClient } from '@cloudflare-ai-gateway/client';

const client = new AIGatewayClient({
  accountId: 'default',
  // Your gateway's auth token, if configured
  apiToken: process.env.CF_AIG_GATEWAY_TOKEN, 
});

// Simple call via the direct proxy
const response = await client.run(
  '@cf/meta/llama-3.1-8b-instruct',
  { prompt: 'What is the capital of France?' },
  {
    gateway: { id: 'my-first-gateway' },
    providerApiToken: process.env.CLOUDFLARE_API_KEY!,
  }
);
console.log(response);

// Access gateway-specific features
const gateway = client.gateway('my-first-gateway');

// Submit feedback for a previous request to improve your models
await gateway.patchLog(client.lastLogId!, { feedback: 1, score: 95 });

// Get a pre-signed URL for use with other SDKs
const openaiBaseUrl = await gateway.getUrl('openai');
console.log(openaiBaseUrl); // -> http://localhost:8080/v1/default/my-first-gateway/openai
```

---

## Configuration Hierarchy

The Cloudflare AI Gateway Toolkits & Services offer a powerful, three-tiered configuration system. Settings are applied with the following precedence, allowing for maximum flexibility:

1.  **Provider-level Payload (Highest Precedence)**: Configuration inside a `Universal Endpoint` step (`config` or `headers` objects) overrides everything else for that specific step.
2.  **Request-level Headers**: `cf-aig-*` headers sent with a request override the gateway's default settings for that single request.
3.  **Gateway-level Defaults (Lowest Precedence)**: The default settings you configure for your gateway (e.g., `cache_ttl`) via the Management API.

---

## Deployment

The Cloudflare AI Gateway Service is a stateless service delivered as a Docker container, designed for easy deployment on any modern cloud infrastructure, including Kubernetes, AWS Fargate, or Google Cloud Run.

## Contributing

We welcome contributions! Please see our `CONTRIBUTING.md` file for guidelines on how to submit pull requests.