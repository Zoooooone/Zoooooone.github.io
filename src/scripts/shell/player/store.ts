import type { Mode } from './playlist';

const KEY = 'player';

export type SavedPlayer = { i?: number; t?: number; v?: number; m?: Mode };

export function readSaved(): SavedPlayer {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function writeSaved(state: { i: number; t: number; v: number; m: Mode }) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}
