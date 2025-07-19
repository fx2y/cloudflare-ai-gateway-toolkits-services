import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ProxyServer } from './proxy-server';
import { GatewayConfigService } from './services/gateway-config-service';
import { GatewayClient } from '../gateway';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;
const CF_API_TOKEN = process.env.CF_API_TOKEN;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;

if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
  console.error(
    'Missing required environment variables: CF_API_TOKEN and CF_ACCOUNT_ID'
  );
  process.exit(1);
}

async function startServer() {
  const app = express();

  // Basic middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.raw({ type: '*/*', limit: '10mb' }));

  // Initialize gateway client and config service
  const gatewayClient = new GatewayClient({
    apiToken: CF_API_TOKEN!,
    accountId: CF_ACCOUNT_ID!,
  });

  const gatewayConfigService = new GatewayConfigService(gatewayClient);

  // Initialize gateway cache
  await gatewayConfigService.initializeCache();

  // Initialize the proxy server
  const proxyServer = new ProxyServer(gatewayConfigService);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount proxy routes
  app.use('/v1', proxyServer.getRouter());

  // Start server
  app.listen(PORT, () => {
    console.log(`Cloudflare AI Gateway Proxy Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
