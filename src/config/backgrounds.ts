export type Background = {
  id: string;
  name: string;
  src: string | null;
  /** Focal point as CSS background-position, e.g. 'center 30%'. Portrait images only show a band on landscape screens; this picks which band. */
  position?: string;
  tone?: { hue?: number; sat?: number; neutral?: boolean };
  en?: string;
  subject?: string;
  credit?: string;
};

export const backgrounds: Background[] = [
  // 2683x4498 portrait: only a horizontal band shows on landscape; 'center 24%' lands it on the head, face and shoulders
  {
    id: 'shattered-light',
    name: '碎光',
    en: 'Shattered Light',
    subject: '丝柯克 · 原神',
    src: '/assets/img/wallpapers/shattered-light.jpg',
    position: 'center 24%',
    credit: 'Genshin Impact © HoYoverse · via Wallhaven',
  },
  {
    id: 'substance-and-being',
    name: '识质存在',
    en: 'Substance & Being',
    src: '/assets/img/wallpapers/substance-and-being.jpg',
    position: 'center',
    credit: '3D artwork · via Wallhaven',
  },
  {
    id: 'amber-greenhouse',
    name: '琥珀温室',
    en: 'Amber Greenhouse',
    subject: '佩丽卡 · 明日方舟：终末地',
    src: '/assets/img/wallpapers/amber-greenhouse.jpg',
    position: 'center',
    credit: 'Arknights: Endfield © Hypergryph / GRYPHLINE · via Wallhaven',
  },
  {
    id: 'london-doves',
    name: '雾都鸽影',
    en: 'London Doves',
    subject: '梅兰妮 · 重返未来：1999',
    src: '/assets/img/wallpapers/london-doves.jpg',
    position: 'center',
    credit: 'Reverse: 1999 © Bluepoch · via Wallhaven',
  },
  {
    id: 'moonlit-walk',
    name: '月下孤行',
    en: 'Moonlit Walk',
    subject: '死亡搁浅',
    src: '/assets/img/wallpapers/moonlit-walk.jpg',
    position: 'center',
    credit: 'Death Stranding © Kojima Productions · screenshot via Wallhaven',
  },
  {
    id: 'infinite-happiness',
    name: '无穷幸福',
    en: 'Infinite Happiness',
    subject: '代码',
    src: '/assets/img/wallpapers/infinite-happiness.jpg',
    position: 'center',
    tone: { neutral: true },
    credit: 'via Wallhaven',
  },
  {
    id: 'silent-endfield',
    name: '静默终末',
    en: 'Silent Endfield',
    subject: '终末地 · 明日方舟：终末地',
    src: '/assets/img/wallpapers/silent-endfield.jpg',
    position: 'center',
    tone: { hue: 42, sat: 58 },
    credit: 'Arknights: Endfield © Hypergryph / GRYPHLINE · via Wallhaven',
  },
];
