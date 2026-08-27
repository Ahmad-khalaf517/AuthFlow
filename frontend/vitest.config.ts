import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'playwright/**', 'node_modules/**', 'dist/**'],
    restoreMocks: true,
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/routes/router.tsx',
        'src/types/**',
      ],
      // Ratcheted to measured coverage minus ~2 points, so a real
      // regression trips the gate instead of disappearing into slack.
      // Measured at the time of writing: 94.05 / 93.03 / 91.23 / 83.2.
      thresholds: {
        lines: 92,
        statements: 91,
        functions: 89,
        branches: 81,
      },
    },
  },
});
