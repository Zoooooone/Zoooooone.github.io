// @ts-check
import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkExtras from './src/plugins/remark-extras.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://zoooooone.github.io',
  trailingSlash: 'always',
  markdown: {
    remarkPlugins: [remarkMath, remarkExtras],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
      defaultColor: false,
    },
  },
});
