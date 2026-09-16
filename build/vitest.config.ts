import { defineConfig } from 'vitest/config';

const config = defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage'
    },
    environment: 'node',
    include: ['src/**/*.spec.ts']
  }
});

export default config;
