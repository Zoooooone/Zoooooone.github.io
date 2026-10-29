export interface Signals {
  automation: 0 | 1 | null;
  screen: string;
  viewport: string;
  lang: string;
  referrer: string;
  /** Time zone the browser reports. */
  tz: string;
  /** Time zone Cloudflare derives from the IP address. */
  ipTz: string;
  asOrg: string;
}

export interface Verdict {
  /** Certain enough to be counted as a bot. */
  bot: boolean;
  /** Looks like a scraper, but real visitors could match too, so it is not called a bot. */
  suspect: boolean;
}

// Cloud and AI networks. Cloudflare is left out on purpose: its WARP exits carry real visitors.
const DATACENTER = /^(?:microsoft|google llc|openai|ahrefs)/i;

const width = (size: string) => Number(size.split('x')[0]);
const area = (zone: string) => zone.split('/')[0];

// A mismatch needs both zones, so old page views without a time zone never count as one.
export function judge(s: Signals): Verdict {
  // 800x600 is the default size of virtual and headless browsers; no real screen has it any more.
  const bot = s.automation === 1 || s.screen === '800x600' || DATACENTER.test(s.asOrg);

  // Residential-proxy scrapers pick a fresh window size and a random time zone for every visit.
  const suspect =
    s.screen === '1920x1080' &&
    s.lang === 'en-US' &&
    !s.referrer &&
    !!s.tz &&
    !!s.ipTz &&
    area(s.tz) !== area(s.ipTz) &&
    !!s.viewport &&
    width(s.viewport) < width(s.screen);

  return { bot, suspect };
}
