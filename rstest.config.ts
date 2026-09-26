import { defineConfig } from '@rstest/core'

export default defineConfig({
  include: ['__test__/**/*.{spec,test}.{js,jsx,ts,tsx}'],
  globals: true,
})
