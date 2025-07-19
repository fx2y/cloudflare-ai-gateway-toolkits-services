/**
 * Cloudflare AI Gateway Management Client
 * 
 * A TypeScript client library for managing Cloudflare AI Gateway resources.
 * Provides CRUD operations for AI Gateways with robust error handling and type safety.
 */

// Main client
export { GatewayClient } from './gateway';

// Configuration types
export type { BaseClientConfig } from './client';

// Core types
export type {
  AIGateway,
  CreateGatewayPayload,
  UpdateGatewayPayload,
  RateLimitingTechnique,
} from './types';

// Error types
export { CloudflareAPIError } from './errors';

// API response types (for advanced users)
export type {
  CloudflareResponseWrapper,
  CloudflareAPIError as CloudflareAPIErrorInterface,
  CloudflareAPIMessage,
  GetGatewayResponse,
  ListGatewaysResponse,
  CreateGatewayResponse,
  UpdateGatewayResponse,
  DeleteGatewayResponse,
} from './types'; 