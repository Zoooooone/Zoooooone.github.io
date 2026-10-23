const URL_PATH = /\/[\w\-./%~]*/.source;
const HOST = /[\w\-.:]+/.source;

export const PATH = new RegExp(`^${URL_PATH}$`);
export const REFERRER = new RegExp(`^(?:${URL_PATH}|https?://${HOST}(?:${URL_PATH})?)$`);
export const SCREEN = /^\d{3,5}x\d{3,5}$/;
export const LANG = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$/;
export const TIMEZONE = /^[A-Za-z]+(\/[A-Za-z0-9_+-]+){0,2}$/;
export const VIEWPORT = /^\d{1,5}x\d{1,5}$/;
export const PIXEL_RATIO = /^\d{1,2}(\.\d{1,2})?$/;
export const CAMPAIGN = /^[\w.-]{1,64}$/;
export const NAV_TYPES = ['navigate', 'reload', 'back_forward', 'prerender', 'spa'];

export const matching = (value: unknown, pattern: RegExp, max: number): string =>
  typeof value === 'string' && value.length <= max && pattern.test(value) ? value : '';

export const isId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{32}$/.test(value);

// null means the browser did not say, which is not the same as no: old pages in open tabs still send the old payload.
export const flag = (value: unknown): 0 | 1 | null => (typeof value === 'boolean' ? (value ? 1 : 0) : null);

export const whole = (value: unknown, max: number): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(Math.max(Math.round(value), 0), max) : null;
