# Zone's blog

基于 [Astro](https://astro.build) 的个人博客:Markdown 写作、静态生成、Waline 评论。文章 URL 与旧的 Jekyll / Chirpy 站点保持一致。

## 常用命令

| 命令                  | 作用                                                                 |
| --------------------- | -------------------------------------------------------------------- |
| `pnpm install`        | 安装依赖(同时启用 git 钩子)                                         |
| `pnpm dev`            | 生成缩略图并启动开发服务器 `localhost:4321`                          |
| `pnpm build`          | 缩略图 → 壁纸对比度检查 → 构建到 `dist/`                             |
| `pnpm preview`        | 本地预览构建结果                                                     |
| `pnpm verify`         | 提交前的完整检查:格式、ESLint、Stylelint、类型、knip、构建、链接检查 |
| `pnpm format`         | 用 Prettier 格式化全部文件                                           |
| `pnpm check:links`    | 检查 `dist/` 里的站内链接与资源引用(需先构建)                       |
| `pnpm check:contrast` | 检查每张壁纸配色的文字对比度(WCAG)                                  |

## 写文章

在 `src/content/posts/<分类>/` 下新建 `YYYY-MM-DD-<slug>.md`,URL 为 `/posts/<slug>/`。

```yaml
---
title: 文章标题
date: 2024-01-01 12:00:00 +0900
categories: [Study notes, Leetcode] # 第一个是父类,第二个是子类
tags: [leetcode, stack]
math: true # 含公式时
mermaid: true # 含流程图时
pin: true # 置顶(可选)
image: /assets/img/xxx.jpg # 封面(可选)
image_position: center 30% # 封面裁切位置(可选)
---
```

图片放在 `public/assets/` 下。`pnpm dev` / `pnpm build` 会为位图自动生成 WebP 缩略图。

## 壁纸

把图片放进 `public/assets/img/wallpapers/`,在 `src/config/backgrounds.ts` 里加一项。主题色会在构建时从图片提取,并通过对比度检查保证文字可读。

## 目录结构

```
src/
├─ config/        站点信息、壁纸列表
├─ content/       文章(Markdown)
├─ layouts/       页面骨架(BaseLayout)
├─ pages/         路由
├─ components/    shell(侧栏/顶栏/播放器…)、post、list、ui
├─ lib/           posts(查询与分类)、theme(取色/对比度)、assets(缩略图)
├─ scripts/       浏览器端脚本,按功能分组(core / shell / effects / post / lightbox / comments / pages)
├─ styles/        tokens → base → panels → layout → effects → motion → components → pages → interaction → adaptive
└─ plugins/       remark 插件(兼容旧文章的 kramdown 写法)
scripts/          构建期脚本:缩略图、对比度检查、链接检查
```

浏览器端脚本通过 `onPage()`(`src/scripts/core/lifecycle.ts`)注册:每次进入页面执行一次,离开页面时自动清理,配合 Astro 的 `ClientRouter` 无刷新换页。

## 质量门

- 格式:Prettier(`src/content/` 与 `src/scripts/core/boot.js` 除外)
- 代码:ESLint(typescript-eslint + astro)、Stylelint、`astro check`、knip(未使用的文件 / 导出 / 依赖)
- 产物:构建、壁纸对比度、站内链接
- 提交:husky + lint-staged 检查暂存文件,commitlint 要求 [Conventional Commits](https://www.conventionalcommits.org)(`feat: …`、`fix: …`、`chore: …`)
- CI:`.github/workflows/ci.yml` 在 push / PR 时运行 `pnpm verify`
