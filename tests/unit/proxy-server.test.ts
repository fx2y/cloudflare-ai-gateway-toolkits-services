import { AdapterFactory, DefaultAdapter, AzureOpenAIAdapter, BedrockAdapter } from '../../src/server/adapters/provider-adapter';
import { GatewayConfigService } from '../../src/server/services/gateway-config-service';
import { AuthMiddleware } from '../../src/server/middleware/auth-middleware';
import { GatewayClient } from '../../src/gateway';
import { AIGateway } from '../../src/types';

// Mock the gateway client
jest.mock('../../src/gateway');

describe('Provider Adapters', () => {
  describe('DefaultAdapter', () => {
    const adapter = new DefaultAdapter();

    test('should construct correct URL for OpenAI', () => {
      const targetUrl = adapter.constructTargetUrl(
        'account123',
        'openai',
        'chat/completions',
        '/v1/account123/gateway456/openai/chat/completions'
      );
      expect(targetUrl).toBe('https://api.openai.com/v1/chat/completions');
    });

    test('should construct correct URL for workers-ai with account ID', () => {
      const targetUrl = adapter.constructTargetUrl(
        'account123',
        'workers-ai',
        '@cf/meta/llama-2-7b-chat-int8',
        '/v1/account123/gateway456/workers-ai/@cf/meta/llama-2-7b-chat-int8'
      );
      expect(targetUrl).toBe('https://api.cloudflare.com/client/v4/accounts/account123/ai/run/@cf/meta/llama-2-7b-chat-int8');
    });

    test('should throw error for unsupported provider', () => {
      expect(() => {
        adapter.constructTargetUrl('account123', 'unsupported', 'path', 'url');
      }).toThrow('Unsupported provider: unsupported');
    });

    test('should transform headers correctly', () => {
      const headers = {
        'authorization': 'Bearer token123',
        'content-type': 'application/json',
        'cf-aig-authorization': 'Bearer gateway_token',
        'host': 'localhost:3000',
        'cf-aig-custom': 'custom_value',
        'user-agent': 'test-agent'
      };

      const transformed = adapter.transformHeaders(headers);

      expect(transformed).toEqual({
        'authorization': 'Bearer token123',
        'content-type': 'application/json',
        'user-agent': 'test-agent'
      });
    });
  });

  describe('AzureOpenAIAdapter', () => {
    const adapter = new AzureOpenAIAdapter();

    test('should construct correct Azure URL', () => {
      const targetUrl = adapter.constructTargetUrl(
        'account123',
        'azure-openai',
        'myresource/mydeployment/chat/completions',
        '/v1/account123/gateway456/azure-openai/myresource/mydeployment/chat/completions?api-version=2023-05-15'
      );
      expect(targetUrl).toBe('https://myresource.openai.azure.com/openai/deployments/mydeployment/chat/completions?api-version=2023-05-15');
    });

    test('should throw error for invalid Azure path', () => {
      expect(() => {
        adapter.constructTargetUrl('account123', 'azure-openai', 'invalidpath', 'url');
      }).toThrow('Azure OpenAI path must include resource_name and deployment_name');
    });

    test('should transform Authorization header to api-key', () => {
      const headers = {
        'authorization': 'Bearer azure_token123',
        'content-type': 'application/json',
        'cf-aig-authorization': 'Bearer gateway_token'
      };

      const transformed = adapter.transformHeaders(headers);

      expect(transformed).toEqual({
        'api-key': 'azure_token123',
        'content-type': 'application/json'
      });
    });
  });

  describe('BedrockAdapter', () => {
    const adapter = new BedrockAdapter();

    test('should construct correct Bedrock URL', () => {
      const targetUrl = adapter.constructTargetUrl(
        'account123',
        'aws-bedrock',
        'us-east-1/model/anthropic.claude-v2/invoke',
        '/v1/account123/gateway456/aws-bedrock/us-east-1/model/anthropic.claude-v2/invoke'
      );
      expect(targetUrl).toBe('https://bedrock-runtime.us-east-1.amazonaws.com/model/anthropic.claude-v2/invoke');
    });

    test('should preserve AWS headers', () => {
      const headers = {
        'authorization': 'AWS4-HMAC-SHA256 ...',
        'x-amz-date': '20231201T120000Z',
        'x-amz-content-sha256': 'hash',
        'cf-aig-authorization': 'Bearer gateway_token',
        'content-type': 'application/json'
      };

      const transformed = adapter.transformHeaders(headers);

      expect(transformed).toEqual({
        'authorization': 'AWS4-HMAC-SHA256 ...',
        'x-amz-date': '20231201T120000Z',
        'x-amz-content-sha256': 'hash',
        'content-type': 'application/json'
      });
    });
  });

  describe('AdapterFactory', () => {
    test('should return correct adapter instances', () => {
      expect(AdapterFactory.getAdapter('openai')).toBeInstanceOf(DefaultAdapter);
      expect(AdapterFactory.getAdapter('azure-openai')).toBeInstanceOf(AzureOpenAIAdapter);
      expect(AdapterFactory.getAdapter('aws-bedrock')).toBeInstanceOf(BedrockAdapter);
      expect(AdapterFactory.getAdapter('anthropic')).toBeInstanceOf(DefaultAdapter);
    });
  });
});

describe('GatewayConfigService', () => {
  let mockGatewayClient: jest.Mocked<GatewayClient>;
  let configService: GatewayConfigService;

  const mockGateway: AIGateway = {
    id: 'gateway123',
    name: 'Test Gateway',
    created_on: '2023-01-01T00:00:00Z',
    modified_on: '2023-01-01T00:00:00Z',
    cache_ttl: 300,
    collect_logs: true,
    rate_limiting_limit: 100,
    rate_limiting_interval: 60,
    rate_limiting_technique: 'sliding'
  };

  beforeEach(() => {
    mockGatewayClient = {
      getGateway: jest.fn(),
      listGateways: jest.fn(),
    } as any;

    configService = new GatewayConfigService(mockGatewayClient);
  });

  afterEach(() => {
    configService.clearCache();
    jest.clearAllMocks();
  });

  test('should fetch and cache gateway configuration', async () => {
    mockGatewayClient.getGateway.mockResolvedValue(mockGateway);

    const result = await configService.getGatewayConfig('gateway123');

    expect(result).toEqual(mockGateway);
    expect(mockGatewayClient.getGateway).toHaveBeenCalledWith('gateway123');

    // Second call should use cache
    const cachedResult = await configService.getGatewayConfig('gateway123');
    expect(cachedResult).toEqual(mockGateway);
    expect(mockGatewayClient.getGateway).toHaveBeenCalledTimes(1);
  });

  test('should return null for non-existent gateway', async () => {
    mockGatewayClient.getGateway.mockRejectedValue(new Error('Gateway not found'));

    const result = await configService.getGatewayConfig('nonexistent');

    expect(result).toBeNull();
  });

  test('should initialize cache with all gateways', async () => {
    const mockGateways = [mockGateway, { ...mockGateway, id: 'gateway456', name: 'Gateway 2' }];
    mockGatewayClient.listGateways.mockResolvedValue(mockGateways);

    await configService.initializeCache();

    const stats = configService.getCacheStats();
    expect(stats.size).toBe(2);
    expect(stats.entries).toContain('gateway123');
    expect(stats.entries).toContain('gateway456');
  });
});

describe('AuthMiddleware', () => {
  const mockGateway: AIGateway = {
    id: 'gateway123',
    name: 'Test Gateway',
    created_on: '2023-01-01T00:00:00Z',
    modified_on: '2023-01-01T00:00:00Z',
    cache_ttl: 300,
    collect_logs: true,
    rate_limiting_limit: 100,
    rate_limiting_interval: 60,
    rate_limiting_technique: 'sliding'
  };

  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  test('should allow request when authentication is disabled', () => {
    const gatewayNoAuth = { ...mockGateway, collect_logs: false };
    const middleware = AuthMiddleware.validateAuth(gatewayNoAuth);

    middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  test('should reject request without cf-aig-authorization header', () => {
    const middleware = AuthMiddleware.validateAuth(mockGateway);

    middleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'cf-aig-authorization header is required'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should reject request with malformed authorization header', () => {
    mockReq.headers['cf-aig-authorization'] = 'InvalidFormat token123';
    const middleware = AuthMiddleware.validateAuth(mockGateway);

    middleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'cf-aig-authorization header must start with "Bearer "'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test('should accept request with valid authorization header', () => {
    mockReq.headers['cf-aig-authorization'] = 'Bearer valid_token123';
    const middleware = AuthMiddleware.validateAuth(mockGateway);

    middleware(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });
}); 