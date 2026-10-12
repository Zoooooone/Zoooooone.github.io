# Zone's Blog

[English](README.md) | 简体中文

我的个人博客源码,基于 [Astro](https://astro.build) 构建。线上地址:**https://zoooooone.github.io**。

![首页](docs/homepage.png)

## 特性

- **壁纸联动的主题色。** 构建时从当前壁纸提取主色,分别生成浅色与深色两套配色,并对每一组做 WCAG 对比度检查。
- **不会中断的音乐。** 播放器位于被保留的外壳中,切换页面时音频不会被打断。
- **命令面板。** `Ctrl/⌘ + K` 可以全文搜索、跳转页面、切换壁纸与主题。
- **评论与浏览量** 使用 [Waline](https://waline.js.org)。评论组件在即将滚动到可见区域时才加载。
- **以 Markdown 为中心。** 支持 KaTeX、Mermaid、带复制按钮的代码块、文章目录和图片灯箱。
- **稳定的 URL。** 文章、分类、标签的地址与旧的 Jekyll / Chirpy 站点保持一致。

## 技术栈

Astro 7 · TypeScript · 原生 CSS(不使用框架) · Waline · KaTeX · Mermaid · pnpm

## 快速开始

需要 Node.js 22.12 及以上版本和 pnpm。

```bash
pnpm install
pnpm dev       # http://localhost:4321
pnpm verify    # 格式、ESLint、类型检查、单元与浏览器测试、构建与链接检查
```

## 目录结构

```
src/
├─ config/       站点信息与壁纸列表
├─ content/      文章(Markdown)
├─ layouts/      页面骨架
├─ pages/        路由
├─ components/   shell、post、list、ui 组件
├─ lib/          文章查询、取色与对比度计算、图片工具
├─ scripts/      浏览器端脚本,按功能分组
├─ styles/       tokens → base → panels → layout → components → pages
└─ plugins/      兼容旧 kramdown 写法的 remark 插件
scripts/         构建期工具:缩略图、对比度检查、链接检查
```

## 说明

- 这是个人站点,不是模板。欢迎阅读代码,但不提供配置教程和使用支持。
- MP3 文件不在本仓库中,托管在 Cloudflare R2;歌单和歌词在 `public/assets/audio`,基础地址在 `src/config/site.ts` 中配置。
- 提交遵循 [Conventional Commits](https://www.conventionalcommits.org),由 husky、lint-staged 和 commitlint 检查。CI 会运行 `pnpm verify`。

## 许可

源代码使用 [MIT 许可证](LICENSE)。

`src/content` 和 `public/assets` 下的文章、照片等原创内容 © Zoooooone,保留所有权利。壁纸、专辑封面、歌词和音乐归各自的权利人所有,不适用 MIT 许可证。
