import { CloudflareAPIError as APIErrorInterface } from '../types';

/**
 * Custom error class for Cloudflare API errors
 */
export class CloudflareAPIError extends Error {
  /** HTTP status code */
  public readonly statusCode: number;

  /** Array of API errors from the response */
  public readonly apiErrors: APIErrorInterface[];

  /** Original response data */
  public readonly response?: unknown;

  constructor(
    message: string,
    statusCode: number,
    apiErrors: APIErrorInterface[] = [],
    response?: unknown
  ) {
    super(message);
    this.name = 'CloudflareAPIError';
    this.statusCode = statusCode;
    this.apiErrors = apiErrors;
    this.response = response;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CloudflareAPIError);
    }
  }

  /**
   * Get a formatted error message including API errors
   */
  public getDetailedMessage(): string {
    if (this.apiErrors.length === 0) {
      return this.message;
    }

    const apiErrorMessages = this.apiErrors
      .map(error => `${error.code}: ${error.message}`)
      .join(', ');

    return `${this.message} (API Errors: ${apiErrorMessages})`;
  }

  /**
   * Create error from API response
   */
  public static fromAPIResponse(
    statusCode: number,
    apiErrors: APIErrorInterface[],
    response?: unknown
  ): CloudflareAPIError {
    const primaryMessage =
      apiErrors.length > 0
        ? (apiErrors[0]?.message ?? 'Unknown API error')
        : 'Request failed';

    return new CloudflareAPIError(
      primaryMessage,
      statusCode,
      apiErrors,
      response
    );
  }

  /**
   * Create error from HTTP error (non-API response)
   */
  public static fromHTTPError(
    statusCode: number,
    message: string,
    response?: unknown
  ): CloudflareAPIError {
    return new CloudflareAPIError(
      message || `HTTP ${statusCode} Error`,
      statusCode,
      [],
      response
    );
  }
}
