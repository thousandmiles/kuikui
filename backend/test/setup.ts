import { beforeAll, afterEach, afterAll, vi } from 'vitest';

// Mock Winston logger before any imports that use it
vi.mock('winston', () => ({
  default: {
    createLogger: vi.fn(() => ({
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      http: vi.fn(),
      debug: vi.fn(),
    })),
    format: {
      combine: vi.fn(),
      timestamp: vi.fn(),
      errors: vi.fn(),
      colorize: vi.fn(),
      printf: vi.fn(),
      json: vi.fn(),
    },
    transports: {
      Console: vi.fn(),
    },
    addColors: vi.fn(),
  },
}));

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
