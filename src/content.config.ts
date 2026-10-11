import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// 旧站（Jekyll）的文章 URL 是 /posts/<文件名去掉日期前缀>/，这里保持一致。
const stripDatePrefix = (entry: string) =>
  entry
    .split('/')
    .pop()!
    .replace(/\.mdx?$/, '')
    .replace(/^\d{4}-\d{2}-\d{2}-/, '');

const posts = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/posts',
    generateId: ({ entry }) => stripDatePrefix(entry),
  }),
  schema: z.object({
    title: z.string(),
    // Jekyll 的日期格式形如 "2023-08-29 21:28:00 +0900"
    date: z.preprocess((v) => {
      if (typeof v !== 'string') return v;
      const m = v.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2}):(\d{2})\s*([+-]\d{2}):?(\d{2})$/);
      if (!m) return v;
      const [, day, h, min, s, tzh, tzm] = m;
      return new Date(`${day}T${h.padStart(2, '0')}:${min}:${s}${tzh}:${tzm}`);
    }, z.date()),
    categories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    math: z.boolean().default(false),
    mermaid: z.boolean().default(false),
    pin: z.boolean().default(false),
    image: z.union([z.string(), z.object({ path: z.string(), alt: z.string().optional() })]).optional(),
    img_path: z.string().nullish(),
  }),
});

export const collections = { posts };
