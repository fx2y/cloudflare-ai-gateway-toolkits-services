import { GatewayClient } from '../../src/gateway/gateway-client';
import { CloudflareAPIError } from '../../src/errors/cloudflare-api-error';
import { CreateGatewayPayload } from '../../src/types';

/**
 * Integration tests for GatewayClient
 * 
 * These tests make real API calls to Cloudflare and require:
 * - CF_API_TOKEN: A valid Cloudflare API token with AI Gateway permissions
 * - CF_ACCOUNT_ID: A valid Cloudflare account ID
 * 
 * ⚠️  WARNING: These tests will create and delete real resources in your Cloudflare account!
 * Only run these tests in a development/testing environment.
 */

describe('GatewayClient Integration Tests', () => {
  let client: GatewayClient;
  let createdGatewayId: string | null = null;
  
  // Skip tests if environment variables are not provided
  const hasRequiredEnv = process.env.CF_API_TOKEN && process.env.CF_ACCOUNT_ID;

  beforeAll(() => {
    if (!hasRequiredEnv) {
      console.log('Skipping integration tests - missing environment variables');
      return;
    }

    client = new GatewayClient({
      apiToken: process.env.CF_API_TOKEN!,
      accountId: process.env.CF_ACCOUNT_ID!,
    });
  });

  afterEach(async () => {
    // Clean up any created gateway
    if (hasRequiredEnv && createdGatewayId && client) {
      try {
        await client.deleteGateway(createdGatewayId);
        console.log(`✅ Cleaned up gateway: ${createdGatewayId}`);
      } catch (error) {
        console.warn(`⚠️  Failed to clean up gateway ${createdGatewayId}:`, error);
      } finally {
        createdGatewayId = null;
      }
    }
  });

  describe('End-to-End Gateway Management', () => {
    it('should perform complete CRUD operations', async () => {
      if (!hasRequiredEnv) {
        console.log('Skipping: End-to-End CRUD test');
        return;
      }

      const uniqueName = `test-gateway-${Date.now()}`;
      
      // Create gateway
      const createPayload: CreateGatewayPayload = {
        name: uniqueName,
        cache_ttl: 300,
        collect_logs: true,
      };

      console.log(`Creating gateway: ${uniqueName}`);
      const createdGateway = await client.createGateway(createPayload);
      createdGatewayId = createdGateway.id;

      expect(createdGateway).toBeDefined();
      expect(createdGateway.name).toBe(uniqueName);
      expect(createdGateway.cache_ttl).toBe(300);
      expect(createdGateway.collect_logs).toBe(true);
      expect(createdGateway.id).toBeDefined();
      expect(createdGateway.created_on).toBeDefined();
      expect(createdGateway.modified_on).toBeDefined();
      
      console.log(`✅ Created gateway with ID: ${createdGateway.id}`);

      // Get the gateway
      console.log(`Fetching gateway: ${createdGateway.id}`);
      const fetchedGateway = await client.getGateway(createdGateway.id);
      
      expect(fetchedGateway).toEqual(createdGateway);
      console.log(`✅ Successfully fetched gateway`);

      // List gateways (should include our new gateway)
      console.log(`Listing all gateways`);
      const allGateways = await client.listGateways();
      
      expect(Array.isArray(allGateways)).toBe(true);
      const foundGateway = allGateways.find(g => g.id === createdGateway.id);
      expect(foundGateway).toBeDefined();
      console.log(`✅ Found gateway in list (${allGateways.length} total gateways)`);

      // Update the gateway
      const updatePayload = {
        name: `${uniqueName}-updated`,
        cache_ttl: 600,
      };

      console.log(`Updating gateway: ${createdGateway.id}`);
      const updatedGateway = await client.updateGateway(createdGateway.id, updatePayload);
      
      expect(updatedGateway.id).toBe(createdGateway.id);
      expect(updatedGateway.name).toBe(`${uniqueName}-updated`);
      expect(updatedGateway.cache_ttl).toBe(600);
      expect(updatedGateway.modified_on).not.toBe(createdGateway.modified_on);
      console.log(`✅ Successfully updated gateway`);

      // Delete the gateway
      console.log(`Deleting gateway: ${createdGateway.id}`);
      await client.deleteGateway(createdGateway.id);
      createdGatewayId = null; // Mark as cleaned up
      console.log(`✅ Successfully deleted gateway`);

      // Verify deletion - should throw error
      console.log(`Verifying gateway was deleted`);
      await expect(client.getGateway(createdGateway.id)).rejects.toThrow(CloudflareAPIError);
      console.log(`✅ Confirmed gateway was deleted`);
    }, 60000); // 60 second timeout for full CRUD test

    it('should handle rate limiting configuration', async () => {
      if (!hasRequiredEnv) {
        console.log('Skipping: Rate limiting test');
        return;
      }

      const uniqueName = `test-rate-limit-${Date.now()}`;
      
      const createPayload: CreateGatewayPayload = {
        name: uniqueName,
        rate_limiting_limit: 1000,
        rate_limiting_interval: 60,
        rate_limiting_technique: 'fixed',
      };

      console.log(`Creating gateway with rate limiting: ${uniqueName}`);
      const createdGateway = await client.createGateway(createPayload);
      createdGatewayId = createdGateway.id;

      expect(createdGateway.rate_limiting_limit).toBe(1000);
      expect(createdGateway.rate_limiting_interval).toBe(60);
      expect(createdGateway.rate_limiting_technique).toBe('fixed');
      
      console.log(`✅ Created gateway with rate limiting configuration`);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      if (!hasRequiredEnv) {
        console.log('Skipping: Authentication error test');
        return;
      }

      const invalidClient = new GatewayClient({
        apiToken: 'invalid-token',
        accountId: process.env.CF_ACCOUNT_ID!,
      });

      console.log(`Testing authentication error`);
      await expect(invalidClient.listGateways()).rejects.toThrow(CloudflareAPIError);
      console.log(`✅ Correctly handled authentication error`);
    }, 15000);

    it('should handle not found errors', async () => {
      if (!hasRequiredEnv) {
        console.log('Skipping: Not found error test');
        return;
      }

      console.log(`Testing not found error`);
      await expect(client.getGateway('nonexistent-gateway-id')).rejects.toThrow(CloudflareAPIError);
      console.log(`✅ Correctly handled not found error`);
    }, 15000);
  });

  describe('Validation', () => {
    it('should enforce name length limits', async () => {
      if (!hasRequiredEnv) {
        console.log('Skipping: Name length validation test');
        return;
      }

      const invalidPayload: CreateGatewayPayload = {
        name: 'a'.repeat(65), // Exceeds 64 character limit
      };

      console.log(`Testing name length validation`);
      await expect(client.createGateway(invalidPayload)).rejects.toThrow('Gateway name must be 64 characters or less');
      console.log(`✅ Correctly validated name length`);
    });

    it('should enforce rate limiting consistency', async () => {
      if (!hasRequiredEnv) {
        console.log('Skipping: Rate limiting validation test');
        return;
      }

      const invalidPayload: CreateGatewayPayload = {
        name: 'test-validation',
        rate_limiting_limit: 100,
        // Missing interval and technique
      };

      console.log(`Testing rate limiting validation`);
      await expect(client.createGateway(invalidPayload)).rejects.toThrow('When using rate limiting, limit, interval, and technique must all be specified');
      console.log(`✅ Correctly validated rate limiting consistency`);
    });
  });
}); 