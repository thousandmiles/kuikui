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

  // Mock scrollIntoView for DOM elements
  Element.prototype.scrollIntoView = vi.fn();

  // Suppress console warnings and errors during tests
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;
  
  console.log = (...args: unknown[]) => {
    // Suppress test-specific log messages
    const message = args[0]?.toString() || '';
    if (message.includes('Failed to create room')) {
      return;
    }
    originalLog.apply(console, args);
  };

  console.error = (...args: unknown[]) => {
    // Filter out known React Router warnings and test-specific messages
    const message = args[0]?.toString() || '';
    if (
      message.includes('React Router Future Flag Warning') ||
      message.includes('Failed to create room') ||
      message.includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalError.apply(console, args);
  };

  console.warn = (...args: unknown[]) => {
    const message = args[0]?.toString() || '';
    if (message.includes('React Router')) {
      return;
    }
    originalWarn.apply(console, args);
  };
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
