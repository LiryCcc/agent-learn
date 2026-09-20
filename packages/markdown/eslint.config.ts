import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactCompiler from 'eslint-plugin-react-compiler';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const config = defineConfig([
  globalIgnores(['coverage/**', 'dist/**', 'eslint.config.ts', 'node_modules/**']),
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      react.configs.flat['recommended']!,
      react.configs.flat['jsx-runtime']!,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
      reactCompiler.configs.recommended
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error'
    },
    settings: {
      react: {
        version: '19'
      }
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
  }
]);

export default config;
