import { defineConfig } from 'tsdown';

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
  deps: {
    neverBundle: ['react', 'react/jsx-runtime']
  },
  outputOptions: {
    comments: {
      legal: true
    }
  }
});

export default config;
