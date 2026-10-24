import type { Board, LlmModel } from './types';

export interface Metric {
  key: string;
  label: string;
  group: string;
  better: 'high' | 'low';
  value: (model: LlmModel) => number | null;
  format: (value: number) => string;
}

export const BOARD_LABELS: Record<Board, string> = {
  llm: '语言模型',
  'text-to-image': '文生图',
  'image-editing': '图像编辑',
  'text-to-speech': '文生语音',
  'text-to-video': '文生视频',
  'image-to-video': '图生视频',
};

export const formatScore = (n: number) => n.toFixed(1);
export const formatShare = (n: number) => `${(n * 100).toFixed(1)}%`;
export const formatPrice = (n: number) => `$${n < 10 ? n.toFixed(2) : n.toFixed(1)}`;
export const formatSpeed = (n: number) => `${Math.round(n)} t/s`;
export const formatSeconds = (n: number) => `${n < 10 ? n.toFixed(2) : Math.round(n)} s`;

const INDEX_KEYS = new Set([
  'artificial_analysis_intelligence_index',
  'artificial_analysis_coding_index',
  'artificial_analysis_math_index',
]);

const BENCHMARKS: [string, string][] = [
  ['gpqa', 'GPQA Diamond'],
  ['hle', "Humanity's Last Exam"],
  ['mmlu_pro', 'MMLU-Pro'],
  ['lcr', 'AA-LCR 长上下文'],
  ['ifbench', 'IFBench 指令遵循'],
  ['livecodebench', 'LiveCodeBench'],
  ['scicode', 'SciCode'],
  ['terminalbench_v4_0', 'Terminal-Bench 4.0'],
  ['terminalbench_v2_1', 'Terminal-Bench 2.1'],
  ['terminalbench_hard', 'Terminal-Bench Hard'],
  ['tau2', 'τ²-Bench'],
  ['tau_banking', 'τ-Banking'],
  ['aime_25', 'AIME 2025'],
  ['aime', 'AIME'],
  ['math_500', 'MATH-500'],
];

type Column =
  'intelligence' | 'coding' | 'math' | 'tps' | 'ttft' | 'ttfat' | 'price_blended' | 'price_input' | 'price_output';

const column = (
  key: Column,
  label: string,
  group: string,
  better: Metric['better'],
  format: Metric['format'],
): Metric => ({ key, label, group, better, value: (m) => m[key], format });

const INDICES = '综合指数';
const SPEED = '速度与延迟';
const PRICE = '价格 · 每百万 token';

export const INTELLIGENCE = column('intelligence', '智能指数', INDICES, 'high', formatScore);

const FIXED: Metric[] = [
  INTELLIGENCE,
  column('coding', '编程指数', INDICES, 'high', formatScore),
  column('math', '数学指数', INDICES, 'high', formatScore),
];

const SPEED_AND_PRICE: Metric[] = [
  column('tps', '输出速度', SPEED, 'high', formatSpeed),
  column('ttft', '首 token 延迟', SPEED, 'low', formatSeconds),
  column('ttfat', '首个答案 token 延迟', SPEED, 'low', formatSeconds),
  column('price_blended', '混合价格(3:1)', PRICE, 'low', formatPrice),
  column('price_input', '输入价格', PRICE, 'low', formatPrice),
  column('price_output', '输出价格', PRICE, 'low', formatPrice),
];

const benchmark = (key: string, label: string): Metric => ({
  key,
  label,
  group: '单项评测',
  better: 'high',
  value: (m) => m.evaluations[key] ?? null,
  format: formatShare,
});

/** Every metric worth ranking by; an evaluation the API adds later shows up under its raw name. */
export function metricsFor(models: LlmModel[]): Metric[] {
  const known = new Set([...INDEX_KEYS, ...BENCHMARKS.map(([key]) => key)]);
  const extra = [...new Set(models.flatMap((m) => Object.keys(m.evaluations)))].filter((key) => !known.has(key)).sort();
  return [
    ...FIXED,
    ...BENCHMARKS.map(([key, label]) => benchmark(key, label)),
    ...extra.map((key) => benchmark(key, key)),
    ...SPEED_AND_PRICE,
  ];
}
