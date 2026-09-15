import { defineConfig } from 'tsdown';

const config = defineConfig({
  entry: 'src/index.ts',
  outDir: 'dist',
  format: 'esm',
  platform: 'browser',
  fixedExtension: false,
  target: 'esnext',
  dts: {
    resolver: 'tsc',
    sourcemap: true
  },
  sourcemap: true,
  minify: false,
  clean: true,
  deps: {
    neverBundle: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime']
  },
  outputOptions: {
    comments: {
      legal: true
    }
  }
});

export default config;
