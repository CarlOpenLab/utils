import { defineConfig } from '@rspress/core'
import { pluginTypeDoc } from '@rspress/plugin-typedoc'

export default defineConfig({
  root: 'docs',
  base: '/utils/',
  // typedoc emits pages like variables/_toString.md; allow underscore-prefixed
  // files to be routed
  route: {
    excludeConvention: [],
  },
  title: 'utils',
  description:
    'A library of JavaScript common tools — the environment-agnostic core of the utils family',
  icon: '/logo.png',
  logo: '/logo.png',
  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/CarlOpenLab/utils',
      },
    ],
  },
  plugins: [
    pluginTypeDoc({
      entryPoints: ['index.ts'],
      setup(app) {
        // utils also exports variables (e.g. `_toString`); include them so the
        // generated index has no dead links
        app.options.setValue('requiredToBeDocumented', [
          'Class',
          'Function',
          'Interface',
          'Variable',
        ])
      },
    }),
  ],
})
