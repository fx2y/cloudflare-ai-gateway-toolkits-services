import nock from 'nock';
import { GatewayClient } from '../../src/gateway/gateway-client';
import { CloudflareAPIError } from '../../src/errors/cloudflare-api-error';
import { AIGateway, CreateGatewayPayload, UpdateGatewayPayload } from '../../src/types';

describe('GatewayClient', () => {
  let client: GatewayClient;
  const mockConfig = {
    apiToken: 'test-token-123',
    accountId: 'test-account-123',
  };
  const baseURL = 'https://api.cloudflare.com/client/v4';

  beforeEach(() => {
    client = new GatewayClient(mockConfig);
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('createGateway', () => {
    const validPayload: CreateGatewayPayload = {
      name: 'test-gateway',
      cache_ttl: 300,
      collect_logs: true,
    };

    const mockResponse: AIGateway = {
      id: 'gateway-123',
      name: 'test-gateway',
      created_on: '2023-12-01T10:00:00Z',
      modified_on: '2023-12-01T10:00:00Z',
      cache_ttl: 300,
      collect_logs: true,
      rate_limiting_limit: null,
      rate_limiting_interval: null,
      rate_limiting_technique: null,
    };

    it('should create a gateway successfully', async () => {
      nock(baseURL)
        .post('/accounts/test-account-123/ai-gateway/gateways')
        .reply(200, {
          success: true,
          errors: [],
          messages: [],
          result: mockResponse,
        });

      const result = await client.createGateway(validPayload);
      expect(result).toEqual(mockResponse);
    });

    it('should validate required name field', async () => {
      const invalidPayload = { ...validPayload, name: '' };
      await expect(client.createGateway(invalidPayload)).rejects.toThrow('Gateway name is required');
    });

    it('should validate name length limit', async () => {
      const invalidPayload = { ...validPayload, name: 'a'.repeat(65) };
      await expect(client.createGateway(invalidPayload)).rejects.toThrow('Gateway name must be 64 characters or less');
    });

    it('should validate cache_ttl is non-negative', async () => {
      const invalidPayload = { ...validPayload, cache_ttl: -1 };
      await expect(client.createGateway(invalidPayload)).rejects.toThrow('Cache TTL must be non-negative');
    });

    it('should validate rate limiting consistency', async () => {
      const invalidPayload = { 
        ...validPayload, 
        rate_limiting_limit: 100,
        // Missing interval and technique
      };
      await expect(client.createGateway(invalidPayload)).rejects.toThrow('When using rate limiting, limit, interval, and technique must all be specified');
    });

    it('should handle API error response', async () => {
      nock(baseURL)
        .post('/accounts/test-account-123/ai-gateway/gateways')
        .reply(400, {
          success: false,
          errors: [{ code: 1003, message: 'Invalid request parameters' }],
          messages: [],
          result: null,
        });

      await expect(client.createGateway(validPayload)).rejects.toThrow(CloudflareAPIError);
    });

    it('should handle HTTP error', async () => {
      nock(baseURL)
        .post('/accounts/test-account-123/ai-gateway/gateways')
        .reply(401, 'Unauthorized');

      await expect(client.createGateway(validPayload)).rejects.toThrow(CloudflareAPIError);
    });
  });

  describe('listGateways', () => {
    const mockGateways: AIGateway[] = [
      {
        id: 'gateway-1',
        name: 'gateway-one',
        created_on: '2023-12-01T10:00:00Z',
        modified_on: '2023-12-01T10:00:00Z',
        cache_ttl: 0,
        collect_logs: true,
        rate_limiting_limit: null,
        rate_limiting_interval: null,
        rate_limiting_technique: null,
      },
      {
        id: 'gateway-2',
        name: 'gateway-two',
        created_on: '2023-12-01T11:00:00Z',
        modified_on: '2023-12-01T11:00:00Z',
        cache_ttl: 600,
        collect_logs: false,
        rate_limiting_limit: 1000,
        rate_limiting_interval: 60,
        rate_limiting_technique: 'fixed',
      },
    ];

    it('should list gateways successfully', async () => {
      nock(baseURL)
        .get('/accounts/test-account-123/ai-gateway/gateways')
        .reply(200, {
          success: true,
          errors: [],
          messages: [],
          result: mockGateways,
        });

      const result = await client.listGateways();
      expect(result).toEqual(mockGateways);
      expect(result).toHaveLength(2);
    });

    it('should handle empty gateway list', async () => {
      nock(baseURL)
        .get('/accounts/test-account-123/ai-gateway/gateways')
        .reply(200, {
          success: true,
          errors: [],
          messages: [],
          result: [],
        });

      const result = await client.listGateways();
      expect(result).toEqual([]);
    });

    it('should handle API error', async () => {
      nock(baseURL)
        .get('/accounts/test-account-123/ai-gateway/gateways')
        .reply(403, {
          success: false,
          errors: [{ code: 10000, message: 'Authentication error' }],
          messages: [],
          result: null,
        });

      await expect(client.listGateways()).rejects.toThrow(CloudflareAPIError);
    });
  });

  describe('getGateway', () => {
    const mockGateway: AIGateway = {
      id: 'gateway-123',
      name: 'test-gateway',
      created_on: '2023-12-01T10:00:00Z',
      modified_on: '2023-12-01T10:00:00Z',
      cache_ttl: 300,
      collect_logs: true,
      rate_limiting_limit: null,
      rate_limiting_interval: null,
      rate_limiting_technique: null,
    };

    it('should get gateway successfully', async () => {
      nock(baseURL)
        .get('/accounts/test-account-123/ai-gateway/gateways/gateway-123')
        .reply(200, {
          success: true,
          errors: [],
          messages: [],
          result: mockGateway,
        });

      const result = await client.getGateway('gateway-123');
      expect(result).toEqual(mockGateway);
    });

    it('should validate gateway ID', async () => {
      await expect(client.getGateway('')).rejects.toThrow('Gateway ID must be a non-empty string');
      await expect(client.getGateway('   ')).rejects.toThrow('Gateway ID must be a non-empty string');
    });

    it('should handle gateway not found', async () => {
      nock(baseURL)
        .get('/accounts/test-account-123/ai-gateway/gateways/nonexistent')
        .reply(404, {
          success: false,
          errors: [{ code: 1001, message: 'Gateway not found' }],
          messages: [],
          result: null,
        });

      await expect(client.getGateway('nonexistent')).rejects.toThrow(CloudflareAPIError);
    });
  });

  describe('updateGateway', () => {
    const updatePayload: UpdateGatewayPayload = {
      name: 'updated-gateway',
      cache_ttl: 600,
    };

    const mockUpdatedGateway: AIGateway = {
      id: 'gateway-123',
      name: 'updated-gateway',
      created_on: '2023-12-01T10:00:00Z',
      modified_on: '2023-12-01T12:00:00Z',
      cache_ttl: 600,
      collect_logs: true,
      rate_limiting_limit: null,
      rate_limiting_interval: null,
      rate_limiting_technique: null,
    };

    it('should update gateway successfully', async () => {
      nock(baseURL)
        .put('/accounts/test-account-123/ai-gateway/gateways/gateway-123')
        .reply(200, {
          success: true,
          errors: [],
          messages: [],
          result: mockUpdatedGateway,
        });

      const result = await client.updateGateway('gateway-123', updatePayload);
      expect(result).toEqual(mockUpdatedGateway);
    });

    it('should validate gateway ID', async () => {
      await expect(client.updateGateway('', updatePayload)).rejects.toThrow('Gateway ID must be a non-empty string');
    });

    it('should validate update payload is not empty', async () => {
      await expect(client.updateGateway('gateway-123', {})).rejects.toThrow('Update payload must contain at least one field');
    });

    it('should validate name field if provided', async () => {
      const invalidPayload = { name: '' };
      await expect(client.updateGateway('gateway-123', invalidPayload)).rejects.toThrow('Gateway name cannot be empty');
    });

    it('should handle API error', async () => {
      nock(baseURL)
        .put('/accounts/test-account-123/ai-gateway/gateways/gateway-123')
        .reply(400, {
          success: false,
          errors: [{ code: 1003, message: 'Invalid update parameters' }],
          messages: [],
          result: null,
        });

      await expect(client.updateGateway('gateway-123', updatePayload)).rejects.toThrow(CloudflareAPIError);
    });
  });

  describe('deleteGateway', () => {
    it('should delete gateway successfully', async () => {
      nock(baseURL)
        .delete('/accounts/test-account-123/ai-gateway/gateways/gateway-123')
        .reply(200, {
          success: true,
          errors: [],
          messages: [],
          result: { id: 'gateway-123' },
        });

      await expect(client.deleteGateway('gateway-123')).resolves.toBeUndefined();
    });

    it('should validate gateway ID', async () => {
      await expect(client.deleteGateway('')).rejects.toThrow('Gateway ID must be a non-empty string');
    });

    it('should handle API error', async () => {
      nock(baseURL)
        .delete('/accounts/test-account-123/ai-gateway/gateways/gateway-123')
        .reply(404, {
          success: false,
          errors: [{ code: 1001, message: 'Gateway not found' }],
          messages: [],
          result: null,
        });

      await expect(client.deleteGateway('gateway-123')).rejects.toThrow(CloudflareAPIError);
    });
  });
}); 