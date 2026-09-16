import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

const config = defineConfig({
  plugins: [solid()],
  test: {
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage'
    },
    environment: 'jsdom',
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx']
  }
});

export default config;
