/**
 * Provider configuration mapping provider names to their base API endpoints
 */
export const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  'workers-ai': 'https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/run',
  'google-ai-studio': 'https://generativelanguage.googleapis.com',
  'azure-openai': '', // Special case - handled by adapter
  'aws-bedrock': '', // Special case - handled by adapter
  huggingface: 'https://api-inference.huggingface.co',
  cohere: 'https://api.cohere.ai/v1',
}; 