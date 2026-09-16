import { defineConfig } from 'cspell';

const cspellConfig = defineConfig({
  ignorePaths: ['node_modules', '**/package.json', '**/pnpm-lock.yaml', '**/dist'],
  useGitignore: true,
  version: '0.2',
  words: [
    'commonmark',
    'dedupe',
    'esbuild',
    'falsey',
    'gruber',
    'ircs',
    'ischecked',
    'isordered',
    'istask',
    'jiti',
    'jsdom',
    'langchain',
    'liryccc',
    'langgraph',
    'lheading',
    'liry',
    'napi',
    'punct',
    'reflinks',
    'rtrim',
    'setext',
    'suff',
    'vite',
    'vitest',
    'xmpp'
  ]
});

export default cspellConfig;
