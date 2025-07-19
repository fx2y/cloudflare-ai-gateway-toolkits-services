/**
 * Core AI Gateway resource interface
 */
export interface AIGateway {
  /** Unique identifier for the gateway (read-only) */
  readonly id: string;

  /** Gateway name (max 64 characters, required on create) */
  name: string;

  /** ISO 8601 creation timestamp (read-only) */
  readonly created_on: string;

  /** ISO 8601 modification timestamp (read-only) */
  readonly modified_on: string;

  /** Cache TTL in seconds (defaults to 0) */
  cache_ttl: number;

  /** Whether to collect logs (defaults to true) */
  collect_logs: boolean;

  /** Rate limiting limit (requests per interval) */
  rate_limiting_limit: number | null;

  /** Rate limiting interval in seconds */
  rate_limiting_interval: number | null;

  /** Rate limiting technique */
  rate_limiting_technique: 'fixed' | 'sliding' | null;
}

/**
 * Payload for creating a new gateway
 */
export type CreateGatewayPayload = Pick<AIGateway, 'name'> &
  Partial<
    Pick<
      AIGateway,
      | 'cache_ttl'
      | 'collect_logs'
      | 'rate_limiting_limit'
      | 'rate_limiting_interval'
      | 'rate_limiting_technique'
    >
  >;

/**
 * Payload for updating an existing gateway
 */
export type UpdateGatewayPayload = Partial<CreateGatewayPayload>;

/**
 * Rate limiting technique options
 */
export type RateLimitingTechnique = 'fixed' | 'sliding';
