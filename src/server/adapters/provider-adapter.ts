import { PROVIDER_BASE_URLS } from '../config/providers';

/**
 * Interface for provider-specific adapters
 */
export interface ProviderAdapter {
  /**
   * Construct the target URL for the AI provider
   */
  constructTargetUrl(
    accountId: string,
    providerName: string,
    providerPath: string,
    _originalUrl: string
  ): string;

  /**
   * Transform request headers for the provider
   */
  transformHeaders(headers: Record<string, string>): Record<string, string>;
}

/**
 * Default adapter for standard providers (OpenAI, Anthropic, etc.)
 */
export class DefaultAdapter implements ProviderAdapter {
  constructTargetUrl(
    accountId: string,
    providerName: string,
    providerPath: string,
    _originalUrl: string
  ): string {
    const baseUrl = PROVIDER_BASE_URLS[providerName];
    if (!baseUrl) {
      throw new Error(`Unsupported provider: ${providerName}`);
    }

    // Replace {accountId} placeholder for workers-ai
    const finalBaseUrl = baseUrl.replace('{accountId}', accountId);
    
    return `${finalBaseUrl}/${providerPath}`;
  }

  transformHeaders(headers: Record<string, string>): Record<string, string> {
    const transformed = { ...headers };
    
    // Remove gateway-specific headers
    delete transformed['cf-aig-authorization'];
    delete transformed.host;
    
    // Remove any other cf-aig-* headers
    Object.keys(transformed).forEach(key => {
      if (key.toLowerCase().startsWith('cf-aig-')) {
        delete transformed[key];
      }
    });

    return transformed;
  }
}

/**
 * Azure OpenAI adapter - handles Azure-specific URL format and authentication
 */
export class AzureOpenAIAdapter implements ProviderAdapter {
  constructTargetUrl(
    accountId: string,
    providerName: string,
    providerPath: string,
    originalUrl: string
  ): string {
    // Parse Azure path: {resource_name}/{deployment_name}/...
    const pathParts = providerPath.split('/');
    if (pathParts.length < 2) {
      throw new Error('Azure OpenAI path must include resource_name and deployment_name');
    }

    const resourceName = pathParts[0];
    const deploymentName = pathParts[1];
    const restOfPath = pathParts.slice(2).join('/');

    // Extract query string from original URL
    const queryIndex = originalUrl.indexOf('?');
    const queryString = queryIndex !== -1 ? originalUrl.substring(queryIndex) : '';

    return `https://${resourceName}.openai.azure.com/openai/deployments/${deploymentName}/${restOfPath}${queryString}`;
  }

  transformHeaders(headers: Record<string, string>): Record<string, string> {
    const transformed = { ...headers };
    
    // Remove gateway-specific headers
    delete transformed['cf-aig-authorization'];
    delete transformed.host;
    
    // Convert Authorization to api-key for Azure
    if (transformed.authorization || transformed.Authorization) {
      const authHeader = transformed.authorization || transformed.Authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        transformed['api-key'] = authHeader.substring(7);
      }
      delete transformed.authorization;
      delete transformed.Authorization;
    }

    // Remove any other cf-aig-* headers
    Object.keys(transformed).forEach(key => {
      if (key.toLowerCase().startsWith('cf-aig-')) {
        delete transformed[key];
      }
    });

    return transformed;
  }
}

/**
 * Amazon Bedrock adapter - handles AWS v4 signed requests
 */
export class BedrockAdapter implements ProviderAdapter {
  constructTargetUrl(
    accountId: string,
    providerName: string,
    providerPath: string,
    originalUrl: string
  ): string {
    // Parse Bedrock path: {region}/{...path}
    const pathParts = providerPath.split('/');
    if (pathParts.length < 1) {
      throw new Error('Bedrock path must include region');
    }

    const region = pathParts[0];
    const restOfPath = pathParts.slice(1).join('/');

    return `https://bedrock-runtime.${region}.amazonaws.com/${restOfPath}`;
  }

  transformHeaders(headers: Record<string, string>): Record<string, string> {
    const transformed = { ...headers };
    
    // Remove gateway-specific headers only
    delete transformed['cf-aig-authorization'];
    delete transformed.host;
    
    // Remove any cf-aig-* headers but preserve ALL AWS headers
    Object.keys(transformed).forEach(key => {
      if (key.toLowerCase().startsWith('cf-aig-')) {
        delete transformed[key];
      }
    });

    // Preserve all Authorization and X-Amz-* headers as-is
    return transformed;
  }
}

/**
 * Factory to get the appropriate adapter for a provider
 */
export class AdapterFactory {
  static getAdapter(providerName: string): ProviderAdapter {
    switch (providerName) {
      case 'azure-openai':
        return new AzureOpenAIAdapter();
      case 'aws-bedrock':
        return new BedrockAdapter();
      default:
        return new DefaultAdapter();
    }
  }
} 