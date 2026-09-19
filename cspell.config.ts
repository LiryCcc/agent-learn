import { defineConfig } from 'cspell';

const cspellConfig = defineConfig({
  ignorePaths: ['node_modules', '**/package.json', '**/pnpm-lock.yaml', '**/dist', '*-schema.json'],
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
    'jsonl',
    'langchain',
    'liryccc',
    'langgraph',
    'lheading',
    'liry',
    'napi',
    'punct',
    'reflinks',
    'rtrim',
    'safesearch',
    'serp',
    'serpapi',
    'setext',
    'suff',
    'tavily',
    'turbo',
    'turborepo',
    'vite',
    'vitest',
    'xmpp'
  ]
});

export default cspellConfig;
