### **Implementation Tasklist: Epic 0 - Foundational Gateway Management Client**

This document provides a detailed, self-contained, hierarchical task list for implementing the "Gateway Management Client" library. It assumes a developer will use this as a step-by-step guide.

#### **1. Project Scaffolding & Core Dependencies**

*   **1.1. Task: Initialize Project Environment**
    *   [ ] Initialize a new project repository (e.g., `git init`).
    *   [ ] Initialize a new Node.js project (`npm init` or similar).
    *   [ ] Setup a standard directory structure (`src/`, `tests/`, `dist/`).
    *   [ ] Configure TypeScript (`tsconfig.json`) for modern Node.js with strict type checking.
    *   [ ] Configure ESLint and Prettier for code quality and consistency.

*   **1.2. Task: Install Core Dependencies**
    *   [ ] Install a robust HTTP client (e.g., `axios`, `node-fetch`). This will be the foundation for all API communication.
    *   [ ] Install a testing framework (e.g., `jest`, `vitest`).
    *   [ ] Install a library for managing environment variables (e.g., `dotenv`) to handle API tokens securely.

#### **2. API Data Models & Type Definitions**

*   **2.1. Task: Define Core Resource Interfaces (TypeScript)**
    *   **2.1.1. Checklist: `AIGateway` Interface**
        *   [ ] `id`: `string` (read-only)
        *   [ ] `name`: `string` (max 64 chars, required on create)
        *   [ ] `created_on`: `string` (ISO 8601 date, read-only)
        *   [ ] `modified_on`: `string` (ISO 8601 date, read-only)
        *   [ ] `cache_ttl`: `number` (seconds, defaults to 0)
        *   [ ] `collect_logs`: `boolean` (defaults to true)
        *   [ ] `rate_limiting_limit`: `number | null`
        *   [ ] `rate_limiting_interval`: `number | null` (seconds)
        *   [ ] `rate_limiting_technique`: `"fixed" | "sliding" | null`

    *   **2.1.2. Checklist: Payload Types**
        *   [ ] Create `CreateGatewayPayload` type using `Pick` or `Omit` from `AIGateway` (e.g., `name` is required, others optional).
        *   [ ] Create `UpdateGatewayPayload` type using `Partial<CreateGatewayPayload>`.

*   **2.2. Task: Define Cloudflare API Wrapper Interfaces**
    *   **Purpose**: Model the standard JSON response structure of the Cloudflare API for type-safe parsing.
    *   **2.2.1. Checklist: Generic Wrapper**
        *   [ ] `success`: `boolean`
        *   [ ] `errors`: `Array<{ code: number; message: string; }>`
        *   [ ] `messages`: `Array<{ code: number; message: string; }>`
        *   [ ] `result`: `T` (This will be a generic type parameter).
    *   **2.2.2. Checklist: Specific Response Types**
        *   [ ] `GetGatewayResponse`: `CloudflareResponseWrapper<AIGateway>`
        *   [ ] `ListGatewaysResponse`: `CloudflareResponseWrapper<AIGateway[]>`
        *   [ ] `DeleteGatewayResponse`: `CloudflareResponseWrapper<{ id: string }>` or similar simple success object.

#### **3. Core HTTP Client Implementation**

*   **3.1. Task: Develop a Reusable Base Client**
    *   **Purpose**: Abstract away the details of making authenticated requests to the Cloudflare API.
    *   **3.1.1. Checklist: Client Constructor & Configuration**
        *   [ ] The client class/module must be initialized with `apiToken` and `accountId`.
        *   [ ] Store the Cloudflare API base URL: `https://api.cloudflare.com/client/v4`.
        *   [ ] Throw an error if `apiToken` or `accountId` are missing.

    *   **3.1.2. Checklist: Generic Request Methods**
        *   [ ] Implement a private `request<T>(config)` method that wraps the chosen HTTP client.
        *   [ ] Automatically inject the `Authorization: Bearer {apiToken}` header into every request.
        *   [ ] Automatically inject the `Content-Type: application/json` header for `POST`/`PUT` requests.
        *   [ ] Implement robust error handling (see Section 5).
        *   [ ] Parse the response and return only the `result` property if `success` is `true`.

#### **4. Gateway Resource Endpoint Implementation (CRUD)**

*   **4.1. Task: Implement `createGateway(payload: CreateGatewayPayload)` Method**
    *   [ ] Perform basic client-side validation on the payload (e.g., `name` length <= 64).
    *   [ ] Use the base client to make a `POST` request.
    *   [ ] Construct the correct URL: `/accounts/{accountId}/ai-gateway/gateways`.
    *   [ ] Pass the `payload` as the request body.
    *   [ ] Return a `Promise<AIGateway>` with the newly created resource.

*   **4.2. Task: Implement `listGateways()` Method**
    *   [ ] Use the base client to make a `GET` request.
    *   [ ] Construct the correct URL: `/accounts/{accountId}/ai-gateway/gateways`.
    *   [ ] Return a `Promise<AIGateway[]>` with the list of gateway resources.

*   **4.3. Task: Implement `getGateway(gatewayId: string)` Method**
    *   [ ] Validate that `gatewayId` is a non-empty string.
    *   [ ] Use the base client to make a `GET` request.
    *   [ ] Construct the correct URL: `/accounts/{accountId}/ai-gateway/gateways/{gatewayId}`.
    *   [ ] Return a `Promise<AIGateway>` with the specific gateway resource.

*   **4.4. Task: Implement `updateGateway(gatewayId: string, payload: UpdateGatewayPayload)` Method**
    *   [ ] Validate that `gatewayId` is a non-empty string.
    *   [ ] Use the base client to make a `PUT` request.
    *   [ ] Construct the correct URL: `/accounts/{accountId}/ai-gateway/gateways/{gatewayId}`.
    *   [ ] Pass the `payload` as the request body.
    *   [ ] Return a `Promise<AIGateway>` with the updated resource.

*   **4.5. Task: Implement `deleteGateway(gatewayId: string)` Method**
    *   [ ] Validate that `gatewayId` is a non-empty string.
    *   [ ] Use the base client to make a `DELETE` request.
    *   [ ] Construct the correct URL: `/accounts/{accountId}/ai-gateway/gateways/{gatewayId}`.
    *   [ ] The method should return `Promise<void>` or `Promise<boolean>` upon successful deletion.

#### **5. Error Handling & Validation Strategy**

*   **5.1. Task: Implement Custom Error Types**
    *   [ ] Create a `CloudflareAPIError` class that extends `Error`.
    *   [ ] The custom error should store the HTTP status code, and the `errors` array from the API response for detailed debugging.

*   **5.2. Task: Enhance Base Client Error Handling**
    *   [ ] In the base client's `request` method, wrap the HTTP call in a `try...catch` block.
    *   [ ] **On API Error (`success: false`)**: If the request succeeds but the Cloudflare API returns `success: false`, parse the `errors` array and throw a new `CloudflareAPIError`.
    *   [ ] **On HTTP Error (Status 4xx/5xx)**: Catch exceptions from the HTTP client (e.g., for a 401 Unauthorized or 404 Not Found), and re-throw them as a `CloudflareAPIError`, populating it with the status code and response body if available.

#### **6. Testing & Validation**

*   **6.1. Task: Develop Unit Tests with API Mocking**
    *   [ ] Setup an API mocking library (e.g., `nock`, `msw`, or `jest.mock('axios')`).
    *   **6.1.1. Checklist: Test Scenarios for Each CRUD Method**
        *   [ ] **Success Case**: Mock a successful API response. Verify the client calls the correct URL with the correct method, headers, and body. Assert that the returned data matches the mock.
        *   [ ] **API Failure Case**: Mock a response with `success: false`. Assert that the client throws the custom `CloudflareAPIError` with the correct error messages from the mock.
        *   [ ] **HTTP Failure Case**: Mock a 4xx/5xx HTTP status code. Assert that the client throws the custom `CloudflareAPIError` with the correct status code.
        *   [ ] **Input Validation Case**: Test that calling a method with invalid input (e.g., empty `gatewayId`) throws an error *before* an API call is made.

*   **6.2. Task: Develop an Integration Test Suite (Optional, Recommended)**
    *   [ ] Create a separate test file (e.g., `gateway.integration.test.ts`) that is excluded from the default test run.
    *   [ ] This suite will use real credentials from environment variables (`.env`).
    *   [ ] **Checklist: End-to-End Test Flow**
        *   [ ] **Setup**: Read `CF_API_TOKEN` and `CF_ACCOUNT_ID` from the environment.
        *   [ ] **Test `createGateway`**: Create a new gateway with a unique name.
        *   [ ] **Test `getGateway`**: Fetch the gateway created in the previous step and verify its properties.
        *   [ ] **Test `listGateways`**: List all gateways and ensure the newly created one is present.
        *   [ ] **Test `updateGateway`**: Update the gateway's name or `cache_ttl`. Fetch it again to verify the change.
        *   [ ] **Teardown**: **CRITICALLY IMPORTANT**: Use `deleteGateway` to remove the resource created during the test to avoid leaving orphaned resources in the Cloudflare account. Wrap this in a `finally` block.

#### **7. Documentation & Packaging**

*   **7.1. Task: Write Inline Code Documentation**
    *   [ ] Use TSDoc/JSDoc blocks for every public method and interface.
    *   [ ] Document parameters, return values, and what errors can be thrown.

*   **7.2. Task: Create a `README.md` File**
    *   [ ] Include a clear "Installation" section.
    *   [ ] Provide a "Quick Start" example showing how to initialize the client and perform a basic operation (e.g., create a gateway).
    *   [ ] Add an "API Reference" section that lists all public methods with brief descriptions.

*   **7.3. Task: Configure `package.json` for Publishing**
    *   [ ] Set the `main`, `types`, and `files` properties to ensure the package is correctly consumed by other TypeScript and JavaScript projects.
    *   [ ] Add `prepublishOnly` script to build the project before publishing.
