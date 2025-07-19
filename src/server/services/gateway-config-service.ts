import { GatewayClient } from '../../gateway';
import { AIGateway } from '../../types';

/**
 * Service for managing gateway configurations with caching
 * Fetches gateway configs from Cloudflare API and caches them in memory
 */
export class GatewayConfigService {
  private readonly gatewayClient: GatewayClient;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTTL: number = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(gatewayClient: GatewayClient) {
    this.gatewayClient = gatewayClient;
  }

  /**
   * Get gateway configuration by ID
   * Checks cache first, falls back to API call
   */
  async getGatewayConfig(gatewayId: string): Promise<AIGateway | null> {
    const cacheKey = gatewayId;
    const cachedEntry = this.cache.get(cacheKey);

    // Check if we have a valid cached entry
    if (cachedEntry && Date.now() - cachedEntry.timestamp < this.cacheTTL) {
      return cachedEntry.gateway;
    }

    try {
      // Fetch from API
      const gateway = await this.gatewayClient.getGateway(gatewayId);
      
      // Cache the result
      this.cache.set(cacheKey, {
        gateway,
        timestamp: Date.now(),
      });

      return gateway;
    } catch (error) {
      console.error(`Failed to fetch gateway ${gatewayId}:`, error);
      
      // If we have stale cached data, return it as fallback
      if (cachedEntry) {
        console.warn(`Using stale cache for gateway ${gatewayId}`);
        return cachedEntry.gateway;
      }
      
      return null;
    }
  }

  /**
   * Initialize cache by fetching all gateways
   * Called on server startup
   */
  async initializeCache(): Promise<void> {
    try {
      const gateways = await this.gatewayClient.listGateways();
      const timestamp = Date.now();

      for (const gateway of gateways) {
        this.cache.set(gateway.id, {
          gateway,
          timestamp,
        });
      }

      console.log(`Initialized cache with ${gateways.length} gateways`);
    } catch (error) {
      console.error('Failed to initialize gateway cache:', error);
    }
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

interface CacheEntry {
  gateway: AIGateway;
  timestamp: number;
} 