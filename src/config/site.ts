export const site = {
  title: "Zone's blog",
  tagline: 'Daily life records and study notes.',
  author: 'Zone',
  bio: '机器学习工程师 · 记录日常，也整理学习笔记',
  avatar: '/assets/img/favicons/android-chrome-512x512.png',
  avatarSmall: '/assets/img/favicons/android-chrome-192x192.png',
  github: 'https://github.com/Zoooooone',
  links: [
    { label: 'GitHub', href: 'https://github.com/Zoooooone', icon: 'github' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ziheng-chen-572356285/', icon: 'linkedin' },
    { label: 'Blog Repo', href: 'https://github.com/Zoooooone/Zoooooone.github.io', icon: 'repo' },
    { label: 'Pengao 的博客', href: 'https://ppaul12.github.io/blog/', icon: 'globe' },
  ],
  clock: { label: 'TOKYO', timeZone: 'Asia/Tokyo' },
  now: [
    { label: '所在地', value: '日本 · 东京' },
    { label: '语言', value: '中文 / 日本語 / English' },
    { label: '正在做', value: '重构这个博客' },
  ],
  quote: { text: '写作之难，在于将网状的思维，以树状的结构，通过线性的文字表达出来。', by: '史蒂芬·平克' },
};

// MP3 files are hosted on Cloudflare R2, not in the repo.
export const audioBase = 'https://pub-89107895d621497da89c42413d45844a.r2.dev/audio-upload';

export const waline = {
  serverURL: 'https://waline-beige-eight.vercel.app/',
};
