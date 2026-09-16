import { defineConfig } from 'tsdown';
import solid from 'vite-plugin-solid';

const config = defineConfig({
  entry: 'src/index.tsx',
  outDir: 'dist',
  format: 'esm',
  platform: 'browser',
  fixedExtension: false,
  target: 'esnext',
  tsconfig: 'tsconfig.lib.json',
  dts: true,
  sourcemap: true,
  minify: false,
  clean: true,
  plugins: [solid({ dev: false, hot: false })],
  deps: {
    neverBundle: ['solid-js', 'solid-js/web']
  },
  outputOptions: {
    comments: {
      legal: true
    }
  }
});

export default config;
