import request from 'supertest';
import express from 'express';
import nock from 'nock';
import { ProxyServer } from '../../src/server/proxy-server';
import { GatewayConfigService } from '../../src/server/services/gateway-config-service';
import { GatewayClient } from '../../src/gateway';
import { AIGateway } from '../../src/types';

describe('Proxy Server Integration Tests', () => {
  let app: express.Application;
  let mockGatewayClient: jest.Mocked<GatewayClient>;
  let gatewayConfigService: GatewayConfigService;
  let proxyServer: ProxyServer;

  const mockGateway: AIGateway = {
    id: 'test-gateway',
    name: 'Test Gateway',
    created_on: '2023-01-01T00:00:00Z',
    modified_on: '2023-01-01T00:00:00Z',
    cache_ttl: 300,
    collect_logs: false, // Disable auth for most tests
    rate_limiting_limit: 100,
    rate_limiting_interval: 60,
    rate_limiting_technique: 'sliding'
  };

  beforeAll(() => {
    // Create Express app
    app = express();
    app.use(express.json());
    app.use(express.raw({ type: '*/*', limit: '10mb' }));

    // Mock gateway client
    mockGatewayClient = {
      getGateway: jest.fn(),
      listGateways: jest.fn(),
      createGateway: jest.fn(),
      updateGateway: jest.fn(),
      deleteGateway: jest.fn(),
    } as any;

    // Setup services
    gatewayConfigService = new GatewayConfigService(mockGatewayClient);
    proxyServer = new ProxyServer(gatewayConfigService);

    // Mount routes
    app.use('/v1', proxyServer.getRouter());
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockGatewayClient.getGateway.mockResolvedValue(mockGateway);
    
    // Clear any existing nock interceptors
    nock.cleanAll();
  });

  afterAll(() => {
    nock.cleanAll();
  });

  describe('OpenAI Provider Proxy', () => {
    test('should proxy chat completions request to OpenAI', async () => {
      const openaiResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'Hello! How can I help you today?'
          },
          finish_reason: 'stop'
        }]
      };

      // Mock OpenAI API
      const openaiScope = nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .matchHeader('authorization', 'Bearer sk-test123')
        .matchHeader('content-type', 'application/json')
        .reply(200, openaiResponse);

      const response = await request(app)
        .post('/v1/account123/test-gateway/openai/chat/completions')
        .set('Authorization', 'Bearer sk-test123')
        .set('Content-Type', 'application/json')
        .send({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello!' }]
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(openaiResponse);
      expect(mockGatewayClient.getGateway).toHaveBeenCalledWith('test-gateway');
      expect(openaiScope.isDone()).toBe(true);
    });

    test('should handle OpenAI error responses', async () => {
      // Mock OpenAI API error
      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(400, {
          error: {
            message: 'Invalid request',
            type: 'invalid_request_error'
          }
        });

      const response = await request(app)
        .post('/v1/account123/test-gateway/openai/chat/completions')
        .set('Authorization', 'Bearer sk-test123')
        .set('Content-Type', 'application/json')
        .send({
          model: 'invalid-model',
          messages: []
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Azure OpenAI Provider Proxy', () => {
    test('should proxy request to Azure OpenAI with correct URL format', async () => {
      const azureResponse = {
        id: 'chatcmpl-azure-123',
        object: 'chat.completion',
        created: 1677652288,
        choices: [{ message: { role: 'assistant', content: 'Azure response' } }]
      };

      // Mock Azure OpenAI API
      const azureScope = nock('https://myresource.openai.azure.com')
        .post('/openai/deployments/gpt-35-turbo/chat/completions')
        .matchHeader('api-key', 'azure-key-123')
        .reply(200, azureResponse);

      const response = await request(app)
        .post('/v1/account123/test-gateway/azure-openai/myresource/gpt-35-turbo/chat/completions')
        .set('Authorization', 'Bearer azure-key-123')
        .set('Content-Type', 'application/json')
        .send({
          messages: [{ role: 'user', content: 'Hello Azure!' }]
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(azureResponse);
      expect(azureScope.isDone()).toBe(true);
    });
  });

  describe('AWS Bedrock Provider Proxy', () => {
    test('should proxy request to Bedrock with preserved AWS headers', async () => {
      const bedrockResponse = {
        completion: 'This is a Bedrock response',
        stop_reason: 'end_turn'
      };

      // Mock Bedrock API
      const bedrockScope = nock('https://bedrock-runtime.us-east-1.amazonaws.com')
        .post('/model/anthropic.claude-v2/invoke')
        .matchHeader('authorization', /^AWS4-HMAC-SHA256/)
        .matchHeader('x-amz-date', /^\d{8}T\d{6}Z$/)
        .reply(200, bedrockResponse);

      const response = await request(app)
        .post('/v1/account123/test-gateway/aws-bedrock/us-east-1/model/anthropic.claude-v2/invoke')
        .set('Authorization', 'AWS4-HMAC-SHA256 Credential=...')
        .set('X-Amz-Date', '20231201T120000Z')
        .set('X-Amz-Content-Sha256', 'content-hash')
        .set('Content-Type', 'application/json')
        .send({
          prompt: 'Hello Bedrock!',
          max_tokens_to_sample: 100
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(bedrockResponse);
      expect(bedrockScope.isDone()).toBe(true);
    });
  });

  describe('Authentication Tests', () => {
    const authGateway: AIGateway = {
      ...mockGateway,
      collect_logs: true // Enable auth
    };

    test('should require cf-aig-authorization when auth is enabled', async () => {
      mockGatewayClient.getGateway.mockResolvedValue(authGateway);

      const response = await request(app)
        .post('/v1/account123/test-gateway/openai/chat/completions')
        .set('Authorization', 'Bearer sk-test123')
        .send({ model: 'gpt-3.5-turbo', messages: [] });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toBe('cf-aig-authorization header is required');
    });

    test('should accept valid cf-aig-authorization header', async () => {
      mockGatewayClient.getGateway.mockResolvedValue(authGateway);

      // Mock OpenAI API
      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(200, { choices: [] });

      const response = await request(app)
        .post('/v1/account123/test-gateway/openai/chat/completions')
        .set('Authorization', 'Bearer sk-test123')
        .set('cf-aig-authorization', 'Bearer gateway-token-123')
        .send({ model: 'gpt-3.5-turbo', messages: [] });

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for non-existent gateway', async () => {
      mockGatewayClient.getGateway.mockRejectedValue(new Error('Gateway not found'));

      const response = await request(app)
        .post('/v1/account123/nonexistent-gateway/openai/chat/completions')
        .set('Authorization', 'Bearer sk-test123')
        .send({ model: 'gpt-3.5-turbo', messages: [] });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });

    test('should return 400 for missing required parameters', async () => {
      const response = await request(app)
        .post('/v1/account123//openai/chat/completions') // Missing gatewayId
        .set('Authorization', 'Bearer sk-test123')
        .send({ model: 'gpt-3.5-turbo', messages: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Bad Request');
    });

    test('should handle provider connection errors', async () => {
      // Mock network error
      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .replyWithError('ECONNREFUSED');

      const response = await request(app)
        .post('/v1/account123/test-gateway/openai/chat/completions')
        .set('Authorization', 'Bearer sk-test123')
        .send({ model: 'gpt-3.5-turbo', messages: [] });

      expect(response.status).toBe(502);
      expect(response.body.error).toBe('Bad Gateway');
    });
  });
}); 