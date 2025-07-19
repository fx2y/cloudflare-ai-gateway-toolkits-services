import dotenv from 'dotenv';

// Load environment variables from .env file for integration tests
dotenv.config();

// Ensure required environment variables are present
if (!process.env.CF_API_TOKEN || !process.env.CF_ACCOUNT_ID) {
  console.warn('⚠️  Integration tests require CF_API_TOKEN and CF_ACCOUNT_ID environment variables');
  console.warn('⚠️  These tests will be skipped if environment variables are not provided');
}

// Configure timeouts for integration tests
jest.setTimeout(30000); 