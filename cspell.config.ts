import { defineConfig } from 'cspell';

const cspellConfig = defineConfig({
  ignorePaths: [
    'node_modules',
    '**/package.json',
    '**/pnpm-lock.yaml',
    '**/dist',
  ],
  useGitignore: true,
  version: '0.2',
  words: [
    'liry',
    'dedupe'
  ]
});

export default cspellConfig;
