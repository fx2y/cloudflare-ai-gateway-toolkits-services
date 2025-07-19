import { Router, Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { GatewayConfigService } from './services/gateway-config-service';
import { AuthMiddleware } from './middleware/auth-middleware';
import { AdapterFactory } from './adapters/provider-adapter';

/**
 * Main proxy server that handles AI Gateway requests
 */
export class ProxyServer {
  private readonly gatewayConfigService: GatewayConfigService;
  private readonly router: Router;

  constructor(gatewayConfigService: GatewayConfigService) {
    this.gatewayConfigService = gatewayConfigService;
    this.router = Router();
    this.setupRoutes();
  }

  /**
   * Get the Express router for mounting
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Setup routes for the proxy server
   */
  private setupRoutes(): void {
    // Main proxy route: /v1/:accountId/:gatewayId/:providerName/*
    this.router.all(
      '/:accountId/:gatewayId/:providerName/*',
      this.createProxyHandler()
    );
  }

  /**
   * Create the main proxy handler middleware
   */
  private createProxyHandler() {
    return async (req: Request, res: Response): Promise<void> => {
      try {
        // Extract URL parameters
        const { accountId, gatewayId, providerName } = req.params;
        const providerPath = req.params[0] || ''; // The wildcard path

        // Validate required parameters
        if (!accountId || !gatewayId || !providerName) {
          res.status(400).json({
            error: 'Bad Request',
            message:
              'Missing required parameters: accountId, gatewayId, or providerName',
          });
          return;
        }

        // Fetch gateway configuration
        const gateway =
          await this.gatewayConfigService.getGatewayConfig(gatewayId);
        if (!gateway) {
          res.status(404).json({
            error: 'Not Found',
            message: `Gateway ${gatewayId} not found`,
          });
          return;
        }

        // Run authentication middleware
        const authMiddleware = AuthMiddleware.validateAuth(gateway);
        authMiddleware(req, res, (error?: any) => {
          if (error) {
            // Error was already handled by auth middleware
            return;
          }

          // Continue with proxy logic
          this.handleProxyRequest(
            req,
            res,
            accountId,
            gatewayId,
            providerName,
            providerPath
          );
        });
      } catch (error) {
        console.error('Proxy handler error:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to process request',
        });
      }
    };
  }

  /**
   * Handle the actual proxy request
   */
  private handleProxyRequest(
    req: Request,
    res: Response,
    accountId: string,
    gatewayId: string,
    providerName: string,
    providerPath: string
  ): void {
    try {
      // Get the appropriate adapter for the provider
      const adapter = AdapterFactory.getAdapter(providerName);

      // Construct target URL
      const targetUrl = adapter.constructTargetUrl(
        accountId,
        providerName,
        providerPath,
        req.originalUrl
      );

      // Transform headers
      const transformedHeaders = adapter.transformHeaders(
        req.headers as Record<string, string>
      );

      console.log(`Proxying request to: ${targetUrl}`);

      // Create and execute proxy middleware
      const proxy = createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true,
        pathRewrite: () => '',
        onProxyReq: (proxyReq, req, res) => {
          // Set transformed headers
          Object.entries(transformedHeaders).forEach(([key, value]) => {
            if (value) {
              proxyReq.setHeader(key, value);
            }
          });

          // Log request for debugging
          console.log(`Proxy request: ${req.method} ${targetUrl}`);
        },
        onProxyRes: (proxyRes, req, res) => {
          // Log response for debugging
          console.log(
            `Proxy response: ${proxyRes.statusCode} from ${targetUrl}`
          );
        },
        onError: (err, req, res) => {
          console.error('Proxy error:', err);
          if (!res.headersSent) {
            res.status(502).json({
              error: 'Bad Gateway',
              message: 'Failed to proxy request to AI provider',
            });
          }
        },
      });

      // Execute the proxy
      proxy(req, res, error => {
        if (error) {
          console.error('Proxy middleware error:', error);
          if (!res.headersSent) {
            res.status(500).json({
              error: 'Internal Server Error',
              message: 'Proxy middleware failed',
            });
          }
        }
      });
    } catch (error) {
      console.error('Handle proxy request error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to setup proxy',
        });
      }
    }
  }
}
