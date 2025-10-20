import { afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock environment variables
beforeAll(() => {
  // Mock import.meta.env
  Object.defineProperty(import.meta, 'env', {
    value: {
      MODE: 'test',
      DEV: false,
      PROD: false,
      SSR: false,
      VITE_API_BASE_URL: 'http://localhost:3001/api',
      VITE_WEBSOCKET_URL: 'http://localhost:3001',
      VITE_BACKEND_URL: 'http://localhost:3001',
      VITE_FRONTEND_URL: 'http://localhost:5174',
    },
    writable: true,
  });

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
