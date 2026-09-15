#!/usr/bin/env node
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { build as defaultBuild, defineConfig, mergeConfig, type UserConfig } from 'tsdown';

const c = cwd();

const defaultConfig = defineConfig({
  entry: resolve(c, 'src/index.ts'),
  outExtensions: () => ({ js: '.js', dts: '.ts' }),
  dts: true,
  target: false,
  format: 'es',
  outDir: resolve(c, 'dist'),
  alias: {
    dayjs: resolve(c, 'node_modules/dayjs/esm/index.js')
  }
});

if (import.meta.main) {
  defaultBuild(defaultConfig);
}

export const build = (...configs: UserConfig[]) => defaultBuild(mergeConfig(defaultConfig, ...configs));
