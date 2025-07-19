import { Request, Response, NextFunction } from 'express';
import { AIGateway } from '../../types';

/**
 * Authentication middleware for AI Gateway
 * Validates cf-aig-authorization header when gateway requires authentication
 */
export class AuthMiddleware {
  /**
   * Middleware function to validate gateway authentication
   */
  static validateAuth(gateway: AIGateway) {
    return (req: Request, res: Response, next: NextFunction): void => {
      // If authentication is not enabled, allow the request
      if (!gateway.collect_logs) {
        // Note: Using collect_logs as a proxy for authentication_enabled
        // since the current gateway type doesn't have authentication_enabled field
        next();
        return;
      }

      // Extract cf-aig-authorization header
      const authHeader = req.headers['cf-aig-authorization'] as string;

      if (!authHeader) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'cf-aig-authorization header is required',
        });
        return;
      }

      if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'cf-aig-authorization header must start with "Bearer "',
        });
        return;
      }

      const token = authHeader.substring(7);

      // TODO: Validate token against gateway's allowed tokens
      // For now, we'll accept any non-empty token
      if (!token || token.trim().length === 0) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Invalid authorization token',
        });
        return;
      }

      // Token is valid, continue
      next();
    };
  }
} 