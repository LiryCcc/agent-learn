import { defineConfig } from 'vitest/config';

const config = defineConfig({
  test: {
    projects: [
      'agent-core/vitest.config.ts',
      'agent-fe/vite.config.ts',
      'markdown/vitest.config.ts',
      'utils/vitest.config.ts'
    ]
  }
});

export default config;
