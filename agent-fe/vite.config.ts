import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import devtools from 'solid-devtools/vite';
import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

const workspaceRoot = resolve(import.meta.dirname, '..');
const isCi = process.env['CI'] === 'true';

const readGitValue = (arguments_: string[]) => {
  try {
    return execFileSync('git', arguments_, {
      cwd: workspaceRoot,
      encoding: 'utf8'
    }).trim();
  } catch {
    return 'unknown';
  }
};

const getBuildInfo = (mode: string) => {
  return {
    branch:
      process.env['GITHUB_HEAD_REF'] ?? process.env['GITHUB_REF_NAME'] ?? readGitValue(['branch', '--show-current']),
    builtAt: new Date().toISOString(),
    commit: process.env['GITHUB_SHA'] ?? readGitValue(['rev-parse', 'HEAD']),
    mode
  };
};

export default defineConfig(({ mode }) => {
  return {
    base: process.env['VITE_BASE_PATH'] ?? '/',
    build: {
      rollupOptions: {
        output: {
          sourcemapExcludeSources: false
        }
      },
      sourcemap: true,
      target: 'es2020'
    },
    define: {
      __BUILD_INFO__: JSON.stringify(getBuildInfo(mode))
    },
    plugins: [
      devtools({
        autoname: true
      }),
      solid()
    ],
    resolve: {
      alias: {
        '@': resolve(import.meta.dirname, 'src'),
        '@@': resolve(import.meta.dirname)
      }
    },
    server: {
      port: 30312
    },
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
  };
});
