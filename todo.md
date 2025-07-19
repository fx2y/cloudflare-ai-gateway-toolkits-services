### **Implementation Tasklist: Epic 1 - Core Request Proxy & Provider Integration**

This document provides a detailed, self-contained, hierarchical task list for implementing a server/service that acts as the core request proxy for the AI Gateway.

#### **1. Service Scaffolding & Configuration Management**

*   **1.1. Task: Initialize Server Project**
    *   [ ] Initialize a new Node.js project for the server.
    *   [ ] Install a web server framework (e.g., Express.js, Fastify, or Cloudflare Workers for a serverless approach).
    *   [ ] Install a robust HTTP proxy library (e.g., `http-proxy-middleware`) or use the chosen framework's proxy capabilities. This is for streaming request/response bodies efficiently.

*   **1.2. Task: Implement Gateway Configuration Loader & Cache**
    *   **Purpose**: The proxy service must know the configuration of every gateway it serves. Fetching this data from the Cloudflare API on every request is too slow.
    *   [ ] Integrate the **Gateway Management Client** created in Epic 0 as a dependency.
    *   [ ] Implement a `GatewayConfigService` module.
    *   **1.2.1. Checklist: Caching Logic**
        *   [ ] On server startup, use the client to call `listGateways()` and populate an in-memory cache (e.g., a `Map`) keyed by `gatewayId`.
        *   [ ] Implement a TTL (Time-To-Live) for the cache (e.g., 5 minutes) to periodically refresh configurations.
        *   [ ] Implement a `getGatewayConfig(gatewayId)` function that first checks the cache and only makes a `getGateway(gatewayId)` API call on a cache miss.
        *   [ ] Handle the case where a requested `gatewayId` is not found in the cache or API (this should result in an HTTP 404).

*   **1.3. Task: Define Provider-to-URL Mapping**
    *   [ ] Create a configuration file or module that maps a `provider_name` (from the URL) to its base API endpoint.
    *   **1.3.1. Checklist: Initial Provider Map**
        *   [ ] `openai`: `https://api.openai.com/v1`
        *   [ ] `anthropic`: `https://api.anthropic.com/v1`
        *   [ ] `workers-ai`: `https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/run`
        *   [ ] `google-ai-studio`: `https://generativelanguage.googleapis.com`
        *   [ ] ...and so on for other supported providers.
        *   [ ] Note: Azure and Bedrock are special cases and will be handled by adapters.

#### **2. Core Request Handling & Proxy Pipeline**

*   **2.1. Task: Implement Main Request Router**
    *   [ ] Define a route that captures the dynamic segments of the AI Gateway URL pattern.
    *   **Route Pattern**: `GET/POST/PUT /v1/:accountId/:gatewayId/:providerName/*`
    *   **Note**: The final `*` is a wildcard that captures the entire provider-specific path (e.g., `chat/completions`).

*   **2.2. Task: Develop the Core Proxy Middleware**
    *   **Purpose**: This middleware is the heart of the proxy. It orchestrates all subsequent steps for a given request.
    *   **2.2.1. Checklist: Request Processing Flow**
        1.  [ ] **Parse URL**: From the request, extract `accountId`, `gatewayId`, `providerName`, and the provider-specific path (`*`).
        2.  [ ] **Fetch Gateway Config**: Use the `GatewayConfigService` to retrieve the configuration for the extracted `gatewayId`. If not found, immediately respond with `HTTP 404 Not Found`.
        3.  [ ] **Run Authentication**: Execute the Gateway Authentication Middleware (see Section 3).
        4.  [ ] **Select Provider Adapter**: Based on `providerName`, select the appropriate adapter (e.g., `Default`, `Azure`, `Bedrock`).
        5.  [ ] **Construct Target URL**: Use the selected adapter to build the final destination URL for the AI provider.
        6.  [ ] **Proxy the Request**: Forward the request to the target URL, streaming the body and headers.
        7.  [ ] **Stream Response**: Stream the AI provider's response (status, headers, body) back to the original client.

*   **2.3. Task: Implement Header Forwarding Logic**
    *   **Purpose**: Ensure the correct headers are passed to the AI provider while stripping proxy-specific or insecure headers.
    *   **2.3.1. Checklist: Headers to Forward**
        *   [ ] `Authorization`: This is the client's API key for the provider. **This is critical.**
        *   [ ] `Content-Type`: Essential for the provider to parse the request body.
        *   [ ] `Accept`: As specified by the client.
        *   [ ] All custom provider headers (e.g., `OpenAI-Beta`, `anthropic-version`).
    *   **2.3.2. Checklist: Headers to Strip/Ignore**
        *   [ ] `Host`: The proxy must set its own `Host` header for the target provider.
        *   [ ] `cf-aig-authorization`: This header is for the gateway's own auth and must not be sent to the provider.
        *   [ ] Any other `cf-aig-*` headers that are only for gateway control (these will be consumed by later Epics like Caching/Logging).

#### **3. Gateway Authentication Middleware**

*   **3.1. Task: Implement `cf-aig-authorization` Middleware**
    *   **Purpose**: To protect a gateway from unauthorized use if its configuration requires authentication.
    *   **3.1.1. Checklist: Middleware Logic**
        1.  [ ] Receive the `gatewayConfig` object from the previous step.
        2.  [ ] Check if `gatewayConfig.authentication_enabled` is `true`. If `false`, call `next()` to continue the request chain.
        3.  [ ] If `true`, extract the `cf-aig-authorization` header from the request.
        4.  [ ] If the header is missing or malformed (e.g., doesn't start with `Bearer `), respond immediately with `HTTP 401 Unauthorized`.
        5.  [ ] Extract the token from the header.
        6.  [ ] Validate the token against a stored list of valid tokens associated with the gateway. (Assume the `gatewayConfig` object includes a list of valid tokens).
        7.  [ ] If the token is invalid, respond with `HTTP 403 Forbidden`.
        8.  [ ] If the token is valid, call `next()`.

#### **4. Provider-Specific Adapters**

*   **4.1. Task: Implement the Default Adapter**
    *   [ ] This adapter will be used for the majority of providers.
    *   [ ] Its `constructTargetUrl` function will simply combine the provider's base URL (from the map in 1.3) with the wildcard path from the request.

*   **4.2. Task: Implement the Azure OpenAI Adapter**
    *   **Purpose**: Handle the unique URL structure and authentication scheme for Azure OpenAI.
    *   **4.2.1. Checklist: Azure Logic**
        *   [ ] The adapter should be selected when `providerName` is `azure-openai`.
        *   [ ] The wildcard path will contain `{resource_name}/{deployment_name}/...`. The adapter must parse these segments.
        *   [ ] The `constructTargetUrl` function must build the URL in the format: `https://{resource_name}.openai.azure.com/openai/deployments/{deployment_name}/{rest_of_path}?{query_string}`.
        *   [ ] The adapter must modify the outgoing request headers. It should take the client's `Authorization` header and move its value to an `api-key` header, as required by Azure.

*   **4.3. Task: Implement the Amazon Bedrock Adapter**
    *   **Purpose**: Pass through pre-signed AWS v4 requests without modification.
    *   **4.3.1. Checklist: Bedrock Logic**
        *   [ ] The adapter should be selected when `providerName` is `aws-bedrock`.
        *   [ ] The wildcard path will likely contain the region, e.g., `{region}/{...path}`. The adapter must parse this.
        *   [ ] The `constructTargetUrl` function must build the URL in the format: `https://bedrock-runtime.{region}.amazonaws.com/{rest_of_path}`.
        *   [ ] The header forwarding logic must be explicitly configured to be a pure passthrough for all `Authorization` and `X-Amz-*` headers received from the client. **The proxy must not add or alter these headers.**

#### **5. Testing Strategy**

*   **5.1. Task: Unit Test Individual Components**
    *   [ ] Test the URL parser.
    *   [ ] Test each adapter's `constructTargetUrl` function with sample inputs.
    *   [ ] Test the `GatewayConfigService`'s caching logic (e.g., cache hit, cache miss).

*   **5.2. Task: Develop an Integration Test Suite for the Server**
    *   [ ] Use a test runner like `supertest` to make HTTP requests to the running server instance.
    *   [ ] Mock all external dependencies: the Gateway Management API and all AI Provider APIs (using a library like `nock`).
    *   **5.2.1. Checklist: Core Proxy Scenarios**
        *   [ ] **Successful Proxy**: Request to a standard provider (e.g., OpenAI), verify the request is forwarded to the correct mock target with the correct body/headers.
        *   [ ] **Gateway Not Found**: Request with a non-existent `gatewayId` -> verify `404` response.
        *   [ ] **Provider Failure**: Mock the target provider to return a `500` error -> verify the proxy returns a `500`.
    *   **5.2.2. Checklist: Authentication Scenarios**
        *   [ ] **Auth Enabled, No Token**: Mock gateway config with `auth_enabled: true`. Send request without `cf-aig-authorization` header -> verify `401`.
        *   [ ] **Auth Enabled, Invalid Token**: Send request with an invalid token -> verify `403`.
        *   [ ] **Auth Enabled, Valid Token**: Send request with a valid token -> verify request is successfully proxied.
        *   [ ] **Auth Disabled**: Mock gateway with `auth_enabled: false`. Send request without token -> verify request is successfully proxied.
    *   **5.2.3. Checklist: Adapter Scenarios**
        *   [ ] **Azure Test**: Send a request to an Azure path. Verify the mock receives a request at the correct `*.openai.azure.com` URL with an `api-key` header.
        *   [ ] **Bedrock Test**: Send a request to a Bedrock path with mock `X-Amz-*` headers. Verify the mock receives the request with those exact headers intact.
