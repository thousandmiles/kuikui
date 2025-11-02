import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Concise test output - show test names with pass/fail
    reporters: ['verbose'],
    silent: false,
    logHeapUsage: false,
    // Don't print console output during tests
    onConsoleLog: () => false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/test/**',
        '**/__tests__/**',
        '**/__mocks__/**',
        'src/index.ts', // Server startup - tested in E2E
        'src/services/socketService.ts', // Socket.IO - needs integration tests
      ],
      include: ['src/**/*.ts'],
      all: true,
      // Thresholds set to current coverage levels
      // Will be increased as more tests are added
      thresholds: {
        lines: 70,
        functions: 60,
        branches: 75,
        statements: 70,
      },
    },
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    setupFiles: ['./test/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './test'),
    },
  },
});
