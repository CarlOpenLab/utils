import { defineConfig } from '@rslib/core'

export default defineConfig({
  source: {
    entry: {
      index: ['./index.ts', './lib/**'],
    },
  },
  lib: [
    {
      format: 'esm',
      bundle: false,
      output: {
        distPath: { root: './dist/esm' },
        filename: { js: '[name].js' },
      },
    },
    {
      format: 'cjs',
      bundle: false,
      output: {
        distPath: { root: './dist/cjs' },
        filename: { js: '[name].cjs' },
      },
    },
  ],
})
