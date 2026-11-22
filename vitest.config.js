import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Spike config for the unchanged Jest suite. Never merged.
export default defineConfig( {
  resolve: {
    alias: {
      // Same alias as renderer in electron.vite.config.js.
      filenamify: resolve( import.meta.dirname, 'node_modules/filenamify/filenamify.js' ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    clearMocks: false,
    include: [ 'src/**/*.test.{js,jsx}', 'e2e/helpers/**/*.test.js' ],
    setupFiles: [ './spike/jestShim.js', './jest/setup.js', './jest/mobxActionWarning.js' ],
    alias: {
      electron: resolve( import.meta.dirname, 'jest/electron.js' ),
      '@sentry/electron/renderer': resolve( import.meta.dirname, 'jest/sentry.js' ),
    },
  },
} );
