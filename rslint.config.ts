import { defineConfig, js, ts } from '@rslint/core'

export default defineConfig([
  js.configs.recommended,
  ts.configs.recommended,
  {
    rules: {
      // `T = any` style generic defaults are used across the public API
      '@typescript-eslint/no-explicit-any': 'off',
      'no-use-before-define': 'off',
      'no-promise-executor-return': 'off',
    },
  },
  {
    ignores: ['typings/**', 'docs/**', 'dist/**', 'doc_build/**'],
  },
])
