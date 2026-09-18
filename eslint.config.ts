import css from '@eslint/css';
import js from '@eslint/js';
import json from '@eslint/json';
import markdown from '@eslint/markdown';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const contentConfig = defineConfig([
  { files: ['**/*.json'], language: 'json/json', extends: [json.configs.recommended] },
  { files: ['**/*.jsonc'], language: 'json/jsonc', extends: [json.configs.recommended] },
  { files: ['**/*.json5'], language: 'json/json5', extends: [json.configs.recommended] },
  { files: ['**/*.md'], language: 'markdown/gfm', extends: [markdown.configs.recommended] },
  {
    files: ['**/*.css'],
    language: 'css/css',
    extends: [css.configs.recommended],
    rules: {
      'css/no-invalid-properties': ['error', { allowUnknownVariables: true }],
      'css/use-baseline': [
        'error',
        {
          available: 'newly',
          allowProperties: ['overscroll-behavior', 'overscroll-behavior-x', 'resize'],
          allowPropertyValues: { 'font-family': ['ui-monospace'] }
        }
      ]
    }
  }
]);

const config = defineConfig([
  globalIgnores([
    '.agents/**',
    '.github/prompts/**',
    '.github/skills/**',
    '.turbo/**',
    '**/coverage/**',
    '**/dist/**',
    '**/eslint.config.ts',
    '**/node_modules/**'
  ]),
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
    ignores: ['apps/**', 'packages/**'],
    extends: [js.configs.recommended, tseslint.configs.strictTypeChecked],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error'
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_'
        }
      ],
      'no-void': 'error'
    }
  },
  ...contentConfig
]);

export default config;
