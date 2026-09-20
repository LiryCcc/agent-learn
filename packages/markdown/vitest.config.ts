import { defineConfig } from 'vitest/config';

const isCi = process.env['CI'] === 'true';

const config = defineConfig({
  test: {
    coverage: {
      enabled: isCi,
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      reportsDirectory: 'coverage'
    },
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    reporters: isCi ? ['default', ['junit', { outputFile: 'test-results/junit.xml' }]] : ['default']
  }
});

export default config;
