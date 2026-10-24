export interface LlmModel {
  id: string;
  name: string;
  slug: string;
  creator_id: string;
  creator: string;
  release_date: string;
  intelligence: number | null;
  coding: number | null;
  math: number | null;
  price_blended: number | null;
  price_input: number | null;
  price_output: number | null;
  tps: number | null;
  ttft: number | null;
  ttfat: number | null;
  evaluations: Record<string, number | null>;
}

export const MEDIA_BOARDS = [
  'text-to-image',
  'image-editing',
  'text-to-speech',
  'text-to-video',
  'image-to-video',
] as const;
export type MediaBoard = (typeof MEDIA_BOARDS)[number];
export type Board = 'llm' | MediaBoard;

export interface MediaCategory {
  style_category: string | null;
  subject_matter_category: string | null;
  format_category: string | null;
  elo: number | null;
  ci95?: string;
  appearances?: number;
}

export interface MediaModel {
  id: string;
  name: string;
  slug: string;
  creator: string;
  release_date: string;
  elo: number | null;
  rank: number | null;
  ci95: string;
  appearances: number | null;
  categories: MediaCategory[];
}

interface BoardStatus {
  board: Board;
  day: string;
  fetched_at: number;
  models: number;
}

interface Run {
  board: Board;
  ts: number;
  ok: number;
  models: number | null;
  error: string;
}

export interface Latest {
  boards: BoardStatus[];
  runs: Run[];
  daily: { day: string; top: number | null; models: number }[];
  llm: LlmModel[];
  media: Partial<Record<MediaBoard, MediaModel[]>>;
}

interface Span {
  from: string;
  to: string;
  partial: boolean;
}

export interface LlmChange {
  id: string;
  name: string;
  creator: string;
  release_date: string;
  was: number | null;
  now?: number | null;
  /** The two values of the metric chosen for the comparison, which `was` and `now` (intelligence) are not. */
  was_metric?: number | null;
  now_metric?: number | null;
  was_price?: number | null;
  now_price?: number | null;
}

interface MediaChange {
  id: string;
  name: string;
  creator: string;
  was_rank: number | null;
  now_rank?: number | null;
  was: number | null;
  now?: number | null;
}

export interface Changes {
  days: number;
  llm:
    | (Span & {
        metric: string;
        added: LlmChange[];
        removed: LlmChange[];
        rescored: LlmChange[];
        repriced: LlmChange[];
      })
    | null;
  media: Partial<Record<MediaBoard, Span & { added: MediaChange[]; removed: MediaChange[]; moved: MediaChange[] }>>;
}

export interface History {
  id: string;
  days: {
    day: string;
    name: string;
    intelligence: number | null;
    coding: number | null;
    math: number | null;
    price_blended: number | null;
    tps: number | null;
    ttft: number | null;
  }[];
}
