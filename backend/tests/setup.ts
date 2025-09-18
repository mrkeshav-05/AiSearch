// Test setup file
import { config } from '../src/config';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.GOOGLE_API_KEY = 'test-api-key';
process.env.SEARXNG_API_URL = 'http://localhost:8080';

// Global test timeout
// @ts-ignore
jest.setTimeout(10000);