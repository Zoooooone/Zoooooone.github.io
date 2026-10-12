import type { Post } from './types';

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function monthlyActivity(posts: Post[], months = 24) {
  const now = new Date();
  const cells: { key: string; label: string; count: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const key = monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1));
    cells.push({ key, label: key, count: 0 });
  }
  const index = new Map(cells.map((c) => [c.key, c]));
  for (const p of posts) {
    const cell = index.get(monthKey(p.data.date));
    if (cell) cell.count++;
  }
  return cells;
}
