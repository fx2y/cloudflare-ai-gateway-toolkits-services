import { AIGateway } from './gateway';

/**
 * Standard Cloudflare API error structure
 */
export interface CloudflareAPIError {
  /** Error code */
  code: number;

  /** Error message */
  message: string;
}

/**
 * Standard Cloudflare API message structure
 */
export interface CloudflareAPIMessage {
  /** Message code */
  code: number;

  /** Message text */
  message: string;
}

/**
 * Generic Cloudflare API response wrapper
 */
export interface CloudflareResponseWrapper<T> {
  /** Whether the API call was successful */
  success: boolean;

  /** Array of errors (present if success is false) */
  errors: CloudflareAPIError[];

  /** Array of informational messages */
  messages: CloudflareAPIMessage[];

  /** The actual response data (present if success is true) */
  result: T;
}

/**
 * Response for getting a single gateway
 */
export type GetGatewayResponse = CloudflareResponseWrapper<AIGateway>;

/**
 * Response for listing gateways
 */
export type ListGatewaysResponse = CloudflareResponseWrapper<AIGateway[]>;

/**
 * Response for creating a gateway
 */
export type CreateGatewayResponse = CloudflareResponseWrapper<AIGateway>;

/**
 * Response for updating a gateway
 */
export type UpdateGatewayResponse = CloudflareResponseWrapper<AIGateway>;

/**
 * Response for deleting a gateway
 */
export type DeleteGatewayResponse = CloudflareResponseWrapper<{ id: string }>;

/**
 * HTTP request configuration
 */
export interface RequestConfig {
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';

  /** Request URL */
  url: string;

  /** Request headers */
  headers?: Record<string, string>;

  /** Request data/body */
  data?: unknown;

  /** URL parameters */
  params?: Record<string, string | number>;
}
