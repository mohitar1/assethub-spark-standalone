// eslint-disable-next-line import/no-unresolved
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use projects to define different configurations for different test types
    projects: [
      {
        // Configuration for DOM tests (*.dom.test.js)
        test: {
          name: 'dom-tests',
          include: [
            'scripts/**/__tests__/**/*.dom.test.js',
            'blocks/**/__tests__/**/*.dom.test.js',
          ],
          environment: 'jsdom',
          setupFiles: ['./vitest.dom.setup.js'],
        },
      },
      {
        // Configuration for regular tests (*.test.js, excluding *.dom.test.js)
        test: {
          name: 'unit-tests',
          include: [
            'scripts/**/__tests__/**/*.test.js',
            'blocks/**/__tests__/**/*.test.js',
          ],
          exclude: [
            'scripts/**/__tests__/**/*.dom.test.js',
            'blocks/**/__tests__/**/*.dom.test.js',
          ],
          environment: 'node',
        },
      },
      {
        // Integration / smoke tests – hit real endpoints with a session cookie
        test: {
          name: 'integration-tests',
          include: ['tests/integration/**/*.test.js'],
          environment: 'node',
          testTimeout: 30_000,
          hookTimeout: 10_000,
        },
      },
      {
        // AuthZ tests – impersonate users via SUDO cookies to validate permission rules
        test: {
          name: 'authz-tests',
          include: ['tests/authz/**/*.test.js'],
          environment: 'node',
          testTimeout: 30_000,
          hookTimeout: 10_000,
        },
      },
      {
        // Migration tests – unit tests for content stores migration scripts
        test: {
          name: 'migration-tests',
          include: ['migration/**/__tests__/**/*.test.js'],
          environment: 'node',
          testTimeout: 10_000,
        },
      },
    ],
  },
});
