import { beforeAll, afterEach, afterAll, vi } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.BACKEND_URL = 'http://localhost:3001';
process.env.FRONTEND_URL = 'http://localhost:5174';
process.env.CORS_ORIGIN = 'http://localhost:5174';
process.env.ROOM_CAPACITY = '10';
process.env.LOG_LEVEL = 'error';

// Global test setup
beforeAll(() => {
  // Suppress console logs during tests unless LOG_LEVEL=debug
  if (process.env.LOG_LEVEL !== 'debug') {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  }
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Global teardown
afterAll(() => {
  vi.restoreAllMocks();
});
