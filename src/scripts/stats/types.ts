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
}

export interface VisitRow {
  visitor_id: string;
  ts: number;
  path: string;
  referrer: string;
  country: string;
  region: string;
  city: string;
  as_org: string;
  browser: string;
  os: string;
  device: string;
  screen: string;
  lang: string;
  is_bot: boolean;
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
