import { BaseClient, BaseClientConfig } from '../client/base-client';
import {
  AIGateway,
  CreateGatewayPayload,
  UpdateGatewayPayload,
} from '../types';

/**
 * Client for managing Cloudflare AI Gateway resources
 * Provides CRUD operations for gateways
 */
export class GatewayClient {
  private readonly client: BaseClient;

  constructor(config: BaseClientConfig) {
    this.client = new BaseClient(config);
  }

  /**
   * Create a new AI Gateway
   *
   * @param payload - Gateway creation payload
   * @returns Promise resolving to the created gateway
   * @throws CloudflareAPIError if the request fails
   */
  public async createGateway(
    payload: CreateGatewayPayload
  ): Promise<AIGateway> {
    // Validate payload
    this.validateCreatePayload(payload);

    const url = `/accounts/${this.client.getAccountId()}/ai-gateway/gateways`;

    return this.client.request<AIGateway>({
      method: 'POST',
      url,
      data: payload,
    });
  }

  /**
   * List all AI Gateways for the account
   *
   * @returns Promise resolving to an array of gateways
   * @throws CloudflareAPIError if the request fails
   */
  public async listGateways(): Promise<AIGateway[]> {
    const url = `/accounts/${this.client.getAccountId()}/ai-gateway/gateways`;

    return this.client.request<AIGateway[]>({
      method: 'GET',
      url,
    });
  }

  /**
   * Get a specific AI Gateway by ID
   *
   * @param gatewayId - The gateway ID to retrieve
   * @returns Promise resolving to the gateway
   * @throws CloudflareAPIError if the request fails or gateway is not found
   */
  public async getGateway(gatewayId: string): Promise<AIGateway> {
    this.validateGatewayId(gatewayId);

    const url = `/accounts/${this.client.getAccountId()}/ai-gateway/gateways/${gatewayId}`;

    return this.client.request<AIGateway>({
      method: 'GET',
      url,
    });
  }

  /**
   * Update an existing AI Gateway
   *
   * @param gatewayId - The gateway ID to update
   * @param payload - Gateway update payload
   * @returns Promise resolving to the updated gateway
   * @throws CloudflareAPIError if the request fails
   */
  public async updateGateway(
    gatewayId: string,
    payload: UpdateGatewayPayload
  ): Promise<AIGateway> {
    this.validateGatewayId(gatewayId);
    this.validateUpdatePayload(payload);

    const url = `/accounts/${this.client.getAccountId()}/ai-gateway/gateways/${gatewayId}`;

    return this.client.request<AIGateway>({
      method: 'PUT',
      url,
      data: payload,
    });
  }

  /**
   * Delete an AI Gateway
   *
   * @param gatewayId - The gateway ID to delete
   * @returns Promise that resolves when the gateway is deleted
   * @throws CloudflareAPIError if the request fails
   */
  public async deleteGateway(gatewayId: string): Promise<void> {
    this.validateGatewayId(gatewayId);

    const url = `/accounts/${this.client.getAccountId()}/ai-gateway/gateways/${gatewayId}`;

    await this.client.request<{ id: string }>({
      method: 'DELETE',
      url,
    });
  }

  /**
   * Validate gateway ID parameter
   */
  private validateGatewayId(gatewayId: string): void {
    if (!gatewayId || gatewayId.trim().length === 0) {
      throw new Error('Gateway ID must be a non-empty string');
    }
  }

  /**
   * Validate create gateway payload
   */
  private validateCreatePayload(payload: CreateGatewayPayload): void {
    if (!payload.name || payload.name.trim().length === 0) {
      throw new Error('Gateway name is required');
    }

    if (payload.name.length > 64) {
      throw new Error('Gateway name must be 64 characters or less');
    }

    // Validate optional fields
    if (payload.cache_ttl !== undefined && payload.cache_ttl < 0) {
      throw new Error('Cache TTL must be non-negative');
    }

    if (
      payload.rate_limiting_limit !== undefined &&
      payload.rate_limiting_limit !== null &&
      payload.rate_limiting_limit <= 0
    ) {
      throw new Error('Rate limiting limit must be positive when specified');
    }

    if (
      payload.rate_limiting_interval !== undefined &&
      payload.rate_limiting_interval !== null &&
      payload.rate_limiting_interval <= 0
    ) {
      throw new Error('Rate limiting interval must be positive when specified');
    }

    // Validate that rate limiting fields are consistent
    const hasLimit =
      payload.rate_limiting_limit !== undefined &&
      payload.rate_limiting_limit !== null;
    const hasInterval =
      payload.rate_limiting_interval !== undefined &&
      payload.rate_limiting_interval !== null;
    const hasTechnique =
      payload.rate_limiting_technique !== undefined &&
      payload.rate_limiting_technique !== null;

    if (
      (hasLimit || hasInterval || hasTechnique) &&
      !(hasLimit && hasInterval && hasTechnique)
    ) {
      throw new Error(
        'When using rate limiting, limit, interval, and technique must all be specified'
      );
    }
  }

  /**
   * Validate update gateway payload
   */
  private validateUpdatePayload(payload: UpdateGatewayPayload): void {
    if (Object.keys(payload).length === 0) {
      throw new Error('Update payload must contain at least one field');
    }

    // Use the same validation as create, but for defined fields only
    if (payload.name !== undefined) {
      if (!payload.name || payload.name.trim().length === 0) {
        throw new Error('Gateway name cannot be empty');
      }
      if (payload.name.length > 64) {
        throw new Error('Gateway name must be 64 characters or less');
      }
    }

    if (payload.cache_ttl !== undefined && payload.cache_ttl < 0) {
      throw new Error('Cache TTL must be non-negative');
    }

    if (
      payload.rate_limiting_limit !== undefined &&
      payload.rate_limiting_limit !== null &&
      payload.rate_limiting_limit <= 0
    ) {
      throw new Error('Rate limiting limit must be positive when specified');
    }

    if (
      payload.rate_limiting_interval !== undefined &&
      payload.rate_limiting_interval !== null &&
      payload.rate_limiting_interval <= 0
    ) {
      throw new Error('Rate limiting interval must be positive when specified');
    }
  }
}
