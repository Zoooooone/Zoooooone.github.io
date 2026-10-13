import { isMode, type Mode } from './playlist';

const KEY = 'player';

export type SavedPlayer = { i?: number; t?: number; v?: number; m?: Mode };

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function parseSaved(raw: unknown): SavedPlayer {
  if (typeof raw !== 'object' || raw === null) return {};
  const r = raw as Record<string, unknown>;
  const saved: SavedPlayer = {};
  if (isNumber(r.i) && Number.isInteger(r.i) && r.i >= 0) saved.i = r.i;
  if (isNumber(r.t) && r.t >= 0) saved.t = r.t;
  if (isNumber(r.v) && r.v >= 0 && r.v <= 1) saved.v = r.v;
  if (isMode(r.m)) saved.m = r.m;
  return saved;
}

export function readSaved(): SavedPlayer {
  try {
    return parseSaved(JSON.parse(localStorage.getItem(KEY) ?? '{}'));
  } catch {
    return {};
  }
}

export function writeSaved(state: { i: number; t: number; v: number; m: Mode }) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}
