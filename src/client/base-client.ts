import axios, {
  AxiosInstance,
  AxiosResponse,
  AxiosError,
  AxiosRequestConfig,
} from 'axios';
import { CloudflareResponseWrapper, RequestConfig } from '../types';
import { CloudflareAPIError } from '../errors';

/**
 * Configuration for the base client
 */
export interface BaseClientConfig {
  /** Cloudflare API token */
  apiToken: string;

  /** Cloudflare account ID */
  accountId: string;

  /** Base URL for Cloudflare API (optional, defaults to production) */
  baseURL?: string;

  /** Request timeout in milliseconds (optional, defaults to 10000) */
  timeout?: number;
}

/**
 * Base HTTP client for Cloudflare API requests
 * Handles authentication, error handling, and response parsing
 */
export class BaseClient {
  private readonly axios: AxiosInstance;
  private readonly accountId: string;

  constructor(config: BaseClientConfig) {
    // Validate required configuration
    if (!config.apiToken) {
      throw new Error('API token is required');
    }
    if (!config.accountId) {
      throw new Error('Account ID is required');
    }

    this.accountId = config.accountId;

    // Create axios instance with configuration
    this.axios = axios.create({
      baseURL: config.baseURL || 'https://api.cloudflare.com/client/v4',
      timeout: config.timeout || 10000,
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'cloudflare-ai-gateway-client/1.0.0',
      },
    });

    // Add response interceptor for error handling
    this.axios.interceptors.response.use(
      response => response,
      error => this.handleAxiosError(error)
    );
  }

  /**
   * Get the account ID
   */
  public getAccountId(): string {
    return this.accountId;
  }

  /**
   * Make a generic request to the Cloudflare API
   */
  public async request<T>(config: RequestConfig): Promise<T> {
    try {
      const axiosConfig: AxiosRequestConfig = {
        method: config.method,
        url: config.url,
        data: config.data,
        params: config.params,
      };

      // Only add headers if they exist
      if (config.headers) {
        axiosConfig.headers = config.headers;
      }

      const response: AxiosResponse<CloudflareResponseWrapper<T>> =
        await this.axios.request(axiosConfig);

      return this.parseResponse(response);
    } catch (error) {
      if (error instanceof CloudflareAPIError) {
        throw error;
      }

      // Re-throw unexpected errors
      throw new CloudflareAPIError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        500,
        [],
        error
      );
    }
  }

  /**
   * Parse Cloudflare API response and extract result
   */
  private parseResponse<T>(
    response: AxiosResponse<CloudflareResponseWrapper<T>>
  ): T {
    const { data } = response;

    // Check if API call was successful
    if (!data.success) {
      throw CloudflareAPIError.fromAPIResponse(
        response.status,
        data.errors || [],
        data
      );
    }

    return data.result;
  }

  /**
   * Handle axios errors and convert them to CloudflareAPIError
   */
  private handleAxiosError(error: AxiosError): never {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as
        | CloudflareResponseWrapper<unknown>
        | undefined;

      if (data && !data.success) {
        // API responded with error format
        throw CloudflareAPIError.fromAPIResponse(
          status,
          data.errors || [],
          data
        );
      } else {
        // Non-API error response
        throw CloudflareAPIError.fromHTTPError(
          status,
          this.getStatusMessage(status),
          error.response.data
        );
      }
    } else if (error.request) {
      // Request was made but no response received
      throw CloudflareAPIError.fromHTTPError(
        0,
        'Network error: No response received from server',
        error.request
      );
    } else {
      // Something else happened
      throw CloudflareAPIError.fromHTTPError(
        0,
        error.message || 'Request setup error',
        error
      );
    }
  }

  /**
   * Get human-readable status message for HTTP status codes
   */
  private getStatusMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Bad Request: The request was invalid';
      case 401:
        return 'Unauthorized: Invalid or missing API token';
      case 403:
        return 'Forbidden: Insufficient permissions';
      case 404:
        return 'Not Found: Resource does not exist';
      case 429:
        return 'Rate Limited: Too many requests';
      case 500:
        return 'Internal Server Error: Cloudflare API error';
      case 502:
        return 'Bad Gateway: Cloudflare API temporarily unavailable';
      case 503:
        return 'Service Unavailable: Cloudflare API maintenance';
      case 504:
        return 'Gateway Timeout: Request timed out';
      default:
        return `HTTP ${status} Error`;
    }
  }
}
