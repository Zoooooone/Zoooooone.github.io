// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkExtras from './src/plugins/remark-extras.mjs';

const noExternal = ['@material/material-color-utilities'];

export default defineConfig({
  site: 'https://zoooooone.github.io',
  trailingSlash: 'always',
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  redirects: {
    '/page2/': '/',
    '/page3/': '/',
    '/page4/': '/',
    '/page5/': '/',
  },
  vite: {
    // The package ships extensionless ESM imports that plain Node cannot resolve, so the build must bundle it.
    ssr: { noExternal },
    environments: { prerender: { resolve: { noExternal } } },
    // mermaid is imported on demand in pages, so the dev server does not discover it up front. Without pre-bundling it,
    // the first use triggers a re-optimize ("Outdated Optimize Dep") and diagrams do not render (dev only).
    optimizeDeps: {
      include: ['mermaid', 'katex', '@waline/client', '@waline/client/pageview'],
    },
  },
  markdown: {
    processor: unified({ remarkPlugins: [remarkMath, remarkExtras], rehypePlugins: [rehypeKatex] }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
      defaultColor: false,
    },
  },
});
