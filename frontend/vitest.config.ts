import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    css: true,
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
        'src/main.tsx',
      ],
      include: ['src/**/*.{ts,tsx}'],
      all: true,
      // Thresholds set to current coverage levels
      // Will be increased as more tests are added
      thresholds: {
        lines: 23,
        functions: 60,
        branches: 70,
        statements: 23,
      },
    },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'build'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './test'),
    },
  },
});
