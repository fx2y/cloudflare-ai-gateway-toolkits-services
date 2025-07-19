import { CloudflareAPIError } from '../../src/errors/cloudflare-api-error';
import { CloudflareAPIError as APIErrorInterface } from '../../src/types';

describe('CloudflareAPIError', () => {
  describe('constructor', () => {
    it('should create basic error with message and status code', () => {
      const error = new CloudflareAPIError('Test error', 400);
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.apiErrors).toEqual([]);
      expect(error.response).toBeUndefined();
      expect(error.name).toBe('CloudflareAPIError');
    });

    it('should create error with API errors', () => {
      const apiErrors: APIErrorInterface[] = [
        { code: 1003, message: 'Invalid request' },
        { code: 1004, message: 'Missing parameter' },
      ];
      
      const error = new CloudflareAPIError('API failed', 400, apiErrors);
      
      expect(error.apiErrors).toEqual(apiErrors);
    });

    it('should create error with response data', () => {
      const responseData = { additional: 'data' };
      const error = new CloudflareAPIError('Test error', 500, [], responseData);
      
      expect(error.response).toBe(responseData);
    });
  });

  describe('getDetailedMessage', () => {
    it('should return simple message when no API errors', () => {
      const error = new CloudflareAPIError('Simple error', 400);
      
      expect(error.getDetailedMessage()).toBe('Simple error');
    });

    it('should return detailed message with single API error', () => {
      const apiErrors: APIErrorInterface[] = [
        { code: 1003, message: 'Invalid request' },
      ];
      const error = new CloudflareAPIError('API failed', 400, apiErrors);
      
      expect(error.getDetailedMessage()).toBe('API failed (API Errors: 1003: Invalid request)');
    });

    it('should return detailed message with multiple API errors', () => {
      const apiErrors: APIErrorInterface[] = [
        { code: 1003, message: 'Invalid request' },
        { code: 1004, message: 'Missing parameter' },
      ];
      const error = new CloudflareAPIError('API failed', 400, apiErrors);
      
      expect(error.getDetailedMessage()).toBe('API failed (API Errors: 1003: Invalid request, 1004: Missing parameter)');
    });
  });

  describe('fromAPIResponse', () => {
    it('should create error from API response with errors', () => {
      const apiErrors: APIErrorInterface[] = [
        { code: 1003, message: 'Invalid request parameters' },
      ];
      const responseData = { success: false, errors: apiErrors };
      
      const error = CloudflareAPIError.fromAPIResponse(400, apiErrors, responseData);
      
      expect(error.message).toBe('Invalid request parameters');
      expect(error.statusCode).toBe(400);
      expect(error.apiErrors).toEqual(apiErrors);
      expect(error.response).toBe(responseData);
    });

    it('should handle empty API errors array', () => {
      const error = CloudflareAPIError.fromAPIResponse(500, []);
      
      expect(error.message).toBe('Request failed');
      expect(error.statusCode).toBe(500);
      expect(error.apiErrors).toEqual([]);
    });

    it('should use first error message as primary message', () => {
      const apiErrors: APIErrorInterface[] = [
        { code: 1003, message: 'First error' },
        { code: 1004, message: 'Second error' },
      ];
      
      const error = CloudflareAPIError.fromAPIResponse(400, apiErrors);
      
      expect(error.message).toBe('First error');
    });

    it('should handle undefined error message', () => {
      const apiErrors = [
        { code: 1003, message: undefined as unknown as string },
      ];
      
      const error = CloudflareAPIError.fromAPIResponse(400, apiErrors);
      
      expect(error.message).toBe('Unknown API error');
    });
  });

  describe('fromHTTPError', () => {
    it('should create error from HTTP status and message', () => {
      const error = CloudflareAPIError.fromHTTPError(404, 'Not Found');
      
      expect(error.message).toBe('Not Found');
      expect(error.statusCode).toBe(404);
      expect(error.apiErrors).toEqual([]);
    });

    it('should use default message when none provided', () => {
      const error = CloudflareAPIError.fromHTTPError(500, '');
      
      expect(error.message).toBe('HTTP 500 Error');
      expect(error.statusCode).toBe(500);
    });

    it('should include response data', () => {
      const responseData = { error: 'Server error' };
      const error = CloudflareAPIError.fromHTTPError(500, 'Internal Error', responseData);
      
      expect(error.response).toBe(responseData);
    });
  });

  describe('instanceof checks', () => {
    it('should be instance of Error', () => {
      const error = new CloudflareAPIError('Test', 400);
      
      expect(error instanceof Error).toBe(true);
    });

    it('should be instance of CloudflareAPIError', () => {
      const error = new CloudflareAPIError('Test', 400);
      
      expect(error instanceof CloudflareAPIError).toBe(true);
    });
  });

  describe('stack trace', () => {
    it('should have stack trace', () => {
      const error = new CloudflareAPIError('Test error', 400);
      
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('CloudflareAPIError');
    });
  });
}); 