import type { Filters, Measured, VisitRow } from './types';

const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, '0');

export const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

// The Worker groups days and hours in Tokyo time, so every time shown here is Tokyo time too.
function tokyo(ts: number) {
  const d = new Date(ts + TOKYO_OFFSET_MS);
  return {
    date: d.toISOString().slice(0, 10),
    clock: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`,
  };
}

export const tokyoDate = (ts: number) => tokyo(ts).date;

export function formatTime(ts: number, now: number): string {
  const { date, clock } = tokyo(ts);
  return date === tokyo(now).date ? clock : `${date.slice(5)} ${clock.slice(0, 5)}`;
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${pad(s % 60)}s`;
  return `${Math.floor(m / 60)}h ${pad(m % 60)}m`;
}

export const formatCount = (n: number) => n.toLocaleString('en-US');

export function shareOf(part: number, whole: number): string {
  if (whole <= 0) return '—';
  const share = part / whole;
  return part > 0 && share < 0.005 ? '<1%' : `${Math.round(share * 100)}%`;
}

const OTHER = '其他';

export function withOther(list: { name: string; views: number }[], limit: number, total: number) {
  const shown = list.slice(0, limit).map(({ name, views }) => ({ name, views, other: false }));
  const rest = total - shown.reduce((sum, item) => sum + item.views, 0);
  return rest > 0 ? [...shown, { name: OTHER, views: rest, other: true }] : shown;
}

export function formatDateTime(ts: number): string {
  const { date, clock } = tokyo(ts);
  return `${date} ${clock}（东京时间）`;
}

export const percent = ({ measured, yes }: Measured) =>
  measured === 0 ? '—' : `${Math.round((yes / measured) * 100)}%`;

export const yesNo = (value: boolean | null) => (value === null ? '—' : value ? '是' : '否');

export const scrollLabel = (pct: number | null) => (pct === null ? '—' : `${pct}%`);

const NAV_LABELS: Record<string, string> = {
  navigate: '新打开',
  reload: '刷新',
  back_forward: '前进/后退',
  prerender: '预渲染',
  spa: '站内跳转',
};
export const navLabel = (nav: string) => (nav ? (NAV_LABELS[nav] ?? nav) : '—');

export const SCROLL_STEPS = ['0–24%', '25–49%', '50–74%', '75–99%', '100%'];
export const VIEWPORT_STEPS = ['< 576', '576–767', '768–991', '992–1199', '1200–1599', '≥ 1600'];
export const VIEWPORT_TICKS = ['<576', '≥576', '≥768', '≥992', '≥1200', '≥1600'];

let languages: Intl.DisplayNames | undefined;
let regions: Intl.DisplayNames | undefined;

export function languageName(code: string): string {
  if (!code) return '—';
  try {
    languages ??= new Intl.DisplayNames(['zh-CN'], { type: 'language' });
    return languages.of(code) ?? code;
  } catch {
    return code;
  }
}

export function touchLabel(points: number | null): string {
  if (points === null) return '—';
  return points > 0 ? `是（${points} 点）` : '否';
}

export function utmLabel(row: Pick<VisitRow, 'utm_source' | 'utm_medium' | 'utm_campaign'>): string {
  const parts = [row.utm_source, row.utm_medium, row.utm_campaign].filter(Boolean);
  return parts.length ? parts.join(' / ') : '—';
}

export function visitorSummary(rows: Pick<VisitRow, 'ts' | 'path' | 'duration_ms'>[]) {
  const times = rows.map((r) => r.ts);
  return {
    visits: rows.length,
    pages: new Set(rows.map((r) => r.path)).size,
    first: Math.min(...times),
    last: Math.max(...times),
    totalMs: rows.reduce((sum, r) => sum + (r.duration_ms ?? 0), 0),
  };
}

export const shortId = (id: string) => id.slice(0, 8);

const WORDS =
  '水獭 狐狸 海豚 企鹅 松鼠 刺猬 考拉 熊猫 浣熊 仓鼠 兔子 小鹿 灰狼 海豹 海龟 鲸鱼 章鱼 水母 蜜蜂 蝴蝶 蜻蜓 麻雀 燕子 白鹭 天鹅 鹦鹉 乌鸦 翠鸟 蜥蜴 青蛙 壁虎 树懒 袋鼠 羊驼 骆驼 犀牛 河马 斑马 猎豹 山猫 雪豹 驯鹿 河豚 海马 螃蟹 蜗牛 瓢虫 蚂蚁 山雀 画眉 云雀 鹈鹕 麋鹿 野兔 松鸦 喜鹊 黄鹂 杜鹃 白鹤 鸳鸯 孔雀 猕猴 鳐鱼 海星 银杏 梧桐 枫叶 青竹 青松 茉莉 樱花 兰花 荷花 桂花 梅花 菊花 海棠 芭蕉 垂柳 橄榄 柠檬 蜜桃 杨梅 枇杷 荔枝 葡萄 苹果 山楂 板栗 核桃 玉米 红薯 南瓜 芝麻 蘑菇 苔藓 晨星 流云 山风 溪水 晚霞 朝露 月光 星河 海风 雪花 春雨 秋叶 夏蝉 冬阳 暮色 清泉 远山 浮云 潮汐 微光 彩虹 极光 岩石 沙丘 草原 森林 湖泊 瀑布 峡谷 岛屿 灯塔 港湾'.split(
    ' ',
  );

export function visitorName(id: string): string {
  const word = WORDS[parseInt(id.slice(0, 4), 16) % WORDS.length];
  return word + String(parseInt(id.slice(4, 8), 16) % 100).padStart(2, '0');
}

export const NAME_COMBINATIONS = WORDS.length * 100;

export function countryName(code: string): string {
  try {
    regions ??= new Intl.DisplayNames(['zh-CN'], { type: 'region' });
    return regions.of(code) ?? code;
  } catch {
    return code;
  }
}

export function placeLabel(row: Pick<VisitRow, 'city' | 'country'>): string {
  if (row.city && row.country) return `${row.city}, ${row.country}`;
  return row.city || row.country || '—';
}

export function sourceLabel(referrer: string): string {
  if (!referrer) return '直接访问';
  if (referrer.startsWith('/')) return referrer;
  try {
    const url = new URL(referrer);
    return `${url.hostname.replace(/^www\./, '')}${url.pathname === '/' ? '' : url.pathname}`;
  } catch {
    return '—';
  }
}

export function fillDays(
  daily: { day: string; views: number; visitors: number }[],
  days: number,
  today: string,
): { day: string; views: number; visitors: number }[] {
  const dayMs = 24 * 60 * 60 * 1000;
  const index = new Map(daily.map((d) => [d.day, d]));
  const end = Date.parse(`${today}T00:00:00Z`);
  const first = days > 0 ? end - (days - 1) * dayMs : daily.length ? Date.parse(`${daily[0].day}T00:00:00Z`) : end;
  const out = [];
  for (let t = first; t <= end; t += dayMs) {
    const day = new Date(t).toISOString().slice(0, 10);
    out.push(index.get(day) ?? { day, views: 0, visitors: 0 });
  }
  return out;
}

export function heatGrid(cells: { dow: number; hour: number; views: number }[]) {
  const grid = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  for (const c of cells) grid[c.dow][c.hour] = c.views;
  return { grid, max: Math.max(0, ...cells.map((c) => c.views)) };
}

export const heatLevel = (value: number, max: number): 0 | 1 | 2 | 3 | 4 =>
  value <= 0 || max <= 0 ? 0 : (Math.min(4, Math.ceil((value / max) * 4)) as 1 | 2 | 3 | 4);

export function filterLabels(filters: Filters): { key: keyof Filters; text: string }[] {
  const out: { key: keyof Filters; text: string }[] = [];
  if (filters.visitor)
    out.push({ key: 'visitor', text: `访客 ${visitorName(filters.visitor)} · ${shortId(filters.visitor)}` });
  if (filters.path) out.push({ key: 'path', text: `页面 ${filters.path}` });
  if (filters.country) out.push({ key: 'country', text: `地区 ${countryName(filters.country)}` });
  if (filters.first) out.push({ key: 'first', text: '仅新访客' });
  return out;
}
