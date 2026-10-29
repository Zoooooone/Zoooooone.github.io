export interface Named {
  name: string;
  views: number;
  visitors: number;
}

export interface Summary {
  days: number;
  totals: {
    views: number;
    visitors: number;
    newVisitors: number;
    returningVisitors: number;
    avgDurationMs: number | null;
  };
  daily: { day: string; views: number; visitors: number }[];
  heatmap: { dow: number; hour: number; views: number }[];
  pages: { path: string; views: number; visitors: number; avg_ms: number | null }[];
  referrers: { direct: number; internal: number; external: { host: string; views: number }[] };
  countries: Named[];
  cities: { country: string; city: string; views: number; visitors: number }[];
  browsers: Named[];
  systems: Named[];
  devices: Named[];
  networks: Named[];
  languages: Named[];
  screens: Named[];
  timezones: Named[];
  navTypes: Named[];
  utm: { sources: Named[]; mediums: Named[]; campaigns: Named[] };
  viewportWidths: { bucket: number; views: number }[];
  scrollBuckets: { bucket: number; views: number }[];
  /** How many visits carried each signal at all: visits from before it was collected are not "no", they are unknown. */
  behavior: {
    interaction: Measured;
    automation: Measured;
    touch: Measured;
    scroll: { measured: number; average: number | null };
  };
}

export interface Measured {
  measured: number;
  yes: number;
}

export interface VisitRow {
  visitor_id: string;
  ts: number;
  path: string;
  referrer: string;
  country: string;
  region: string;
  city: string;
  asn: number;
  as_org: string;
  tz: string;
  browser: string;
  os: string;
  device: string;
  screen: string;
  viewport: string;
  dpr: string;
  touch: number | null;
  lang: string;
  nav: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  ua: string;
  is_bot: boolean;
  suspect: boolean;
  automation: boolean | null;
  interacted: boolean | null;
  scroll_pct: number | null;
  duration_ms: number | null;
  is_first: boolean;
}

export interface VisitList {
  visits: VisitRow[];
  next: number | null;
}

export interface Filters {
  path?: string;
  country?: string;
  visitor?: string;
  first?: boolean;
}
