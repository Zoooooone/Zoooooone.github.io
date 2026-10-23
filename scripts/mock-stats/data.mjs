const DAY = 24 * 60 * 60 * 1000;
const TOKYO = 9 * 60 * 60 * 1000;
// Visits older than this were recorded before the extra signals existed, so those fields stay unknown.
const SIGNALS_SINCE_DAYS = 5;

let seed = 20261021;
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = (items) => {
  const total = items.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [value, weight] of items) if ((roll -= weight) <= 0) return value;
  return items[0][0];
};

const PLACES = [
  [{ country: 'JP', city: 'Tokyo', region: 'Tokyo', org: 'KDDI', asn: 2516, tz: 'Asia/Tokyo' }, 38],
  [{ country: 'JP', city: 'Osaka', region: 'Osaka', org: 'NTT', asn: 4713, tz: 'Asia/Tokyo' }, 10],
  [{ country: 'CN', city: 'Shanghai', region: 'Shanghai', org: 'China Telecom', asn: 4134, tz: 'Asia/Shanghai' }, 16],
  [{ country: 'CN', city: 'Beijing', region: 'Beijing', org: 'China Unicom', asn: 4837, tz: 'Asia/Shanghai' }, 8],
  [
    { country: 'US', city: 'Los Angeles', region: 'California', org: 'Comcast', asn: 7922, tz: 'America/Los_Angeles' },
    9,
  ],
  [{ country: 'DE', city: 'Frankfurt', region: 'Hesse', org: 'Hetzner', asn: 24940, tz: 'Europe/Berlin' }, 5],
  [{ country: 'SG', city: 'Singapore', region: 'Singapore', org: 'AWS', asn: 16509, tz: 'Asia/Singapore' }, 4],
  [{ country: 'AU', city: 'Sydney', region: 'New South Wales', org: 'Telstra', asn: 1221, tz: 'Australia/Sydney' }, 3],
];
const DEVICES = [
  [{ browser: 'Chrome', os: 'Windows', device: 'desktop' }, 40],
  [{ browser: 'Safari', os: 'iOS', device: 'mobile' }, 20],
  [{ browser: 'Chrome', os: 'Android', device: 'mobile' }, 12],
  [{ browser: 'Safari', os: 'macOS', device: 'desktop' }, 10],
  [{ browser: 'Edge', os: 'Windows', device: 'desktop' }, 10],
  [{ browser: 'Firefox', os: 'Linux', device: 'desktop' }, 5],
  [{ browser: 'Safari', os: 'iOS', device: 'tablet' }, 3],
];
const SCREENS = {
  desktop: [
    ['1920x1080', 40],
    ['1440x900', 20],
    ['1710x1112', 12],
    ['2560x1440', 10],
    ['1536x864', 8],
  ],
  mobile: [
    ['390x844', 50],
    ['412x915', 30],
    ['360x800', 20],
  ],
  tablet: [['820x1180', 100]],
};
const PATHS = [
  ['/', 30],
  ['/posts/docker/', 14],
  ['/posts/pgvector/', 10],
  ['/posts/clean-docker-disk/', 6],
  ['/posts/waline/', 6],
  ['/posts/first-pc-build/', 5],
  ['/posts/year-end-summary/', 4],
  ['/about/', 5],
  ['/archives/', 4],
  ['/tags/', 3],
  ['/changelog/', 3],
  ['/posts/Odawara/', 3],
  ['/posts/Leetcode_343/', 2],
];
const LIST_PATHS = [
  '/tags/leetcode/',
  '/tags/machine-learning/',
  '/tags/claude-code/',
  '/categories/blog/',
  '/archives/',
];
const REFERRERS = [
  ['', 30],
  ['https://www.google.com/search', 22],
  ['https://github.com/Zoooooone', 6],
  ['https://www.zhihu.com/question/1', 3],
  ['https://t.co/', 2],
  ['https://www.bing.com/', 2],
];
const CRAWLER_PLACES = [
  {
    country: 'NL',
    city: 'Beverwijk',
    region: 'North Holland',
    org: 'Vodafone Libertel B.V.',
    asn: 33915,
    tz: 'Europe/Amsterdam',
  },
  { country: 'ID', city: 'Surabaya', region: 'East Java', org: 'PT. Eka Mas Republik', asn: 18004, tz: 'Asia/Jakarta' },
  {
    country: 'EC',
    city: 'La Libertad',
    region: 'Santa Elena',
    org: 'Clientes Guayaquil',
    asn: 27839,
    tz: 'America/Guayaquil',
  },
  { country: 'VE', city: 'Araure', region: 'Portuguesa', org: 'CIDATA, C.A', asn: 11562, tz: 'America/Caracas' },
  {
    country: 'BR',
    city: 'Palestina',
    region: 'Sao Paulo',
    org: 'ELTECWEB PROVEDOR DE INTERNET LTDA',
    asn: 265000,
    tz: 'America/Sao_Paulo',
  },
];
const LANGUAGES = { CN: 'zh-CN', JP: 'ja-JP' };

const now = Date.now();
const randomId = () => Array.from({ length: 32 }, () => Math.floor(random() * 16).toString(16)).join('');
const chance = (p) => random() < p;

function userAgent({ browser, os }) {
  const platform = {
    Windows: 'Windows NT 10.0; Win64; x64',
    macOS: 'Macintosh; Intel Mac OS X 10_15_7',
    Linux: 'X11; Linux x86_64',
    Android: 'Linux; Android 14; Pixel 8',
    iOS: 'iPhone; CPU iPhone OS 17_4 like Mac OS X',
  }[os];
  if (browser === 'Safari')
    return `Mozilla/5.0 (${platform}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15`;
  if (browser === 'Firefox') return `Mozilla/5.0 (${platform}; rv:125.0) Gecko/20100101 Firefox/125.0`;
  const edge = browser === 'Edge' ? ' Edg/124.0.0.0' : '';
  return `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36${edge}`;
}

function readerSignals(visitor, firstOnSite) {
  const [w, h] = visitor.screen.split('x').map(Number);
  return {
    viewport: `${visitor.device === 'desktop' ? Math.round(w * (0.6 + random() * 0.4)) : w}x${Math.round(h * (0.7 + random() * 0.2))}`,
    dpr: {
      iOS: '3',
      Android: '2.63',
      macOS: '2',
      Windows: pick([
        ['1', 5],
        ['1.25', 3],
        ['1.5', 2],
      ]),
      Linux: '1',
    }[visitor.os],
    touch: visitor.device === 'desktop' ? (visitor.os === 'Windows' && chance(0.15) ? 10 : 0) : 5,
    nav: firstOnSite
      ? pick([
          ['navigate', 80],
          ['reload', 8],
          ['back_forward', 12],
        ])
      : pick([
          ['spa', 80],
          ['reload', 8],
          ['back_forward', 12],
        ]),
    utm_source: chance(0.06)
      ? pick([
          ['chatgpt.com', 7],
          ['perplexity.ai', 2],
        ])
      : '',
    automation: false,
    interacted: chance(0.92),
    scroll_pct: pick([
      [10, 18],
      [30, 14],
      [55, 16],
      [80, 20],
      [100, 32],
    ]),
  };
}

const NOT_MEASURED = {
  viewport: '',
  dpr: '',
  touch: null,
  nav: '',
  utm_source: '',
  automation: null,
  interacted: null,
  scroll_pct: null,
  ua: '',
};

const visitors = Array.from({ length: 260 }, () => {
  const place = pick(PLACES);
  const device = pick(DEVICES);
  return {
    id: randomId(),
    ...place,
    ...device,
    screen: pick(SCREENS[device.device]),
    lang: LANGUAGES[place.country] ?? 'en-US',
  };
});
const rows = [];
const seenReader = new Set();
for (let n = 0; n < 1800; n++) {
  const daysAgo = Math.floor(Math.pow(random(), 1.6) * 90);
  const hour = pick(
    [...Array(24).keys()].map((h) => [h, 1 + 9 * Math.exp(-((h - 21) ** 2) / 14) + 4 * Math.exp(-((h - 12) ** 2) / 8)]),
  );
  const day = new Date(now - daysAgo * DAY + TOKYO);
  day.setUTCHours(hour, Math.floor(random() * 60), Math.floor(random() * 60));
  const ts = day.getTime() - TOKYO;
  if (ts > now) continue;

  const measured = daysAgo < SIGNALS_SINCE_DAYS;
  const kind = pick([
    ['reader', 80],
    ['crawler', 12],
    ['flagged', 7],
    ['agent', 1],
  ]);
  const base = {
    ts,
    path: pick(PATHS),
    referrer: random() < 0.25 ? '/' : pick(REFERRERS),
    duration_ms: random() < 0.15 ? null : Math.round(2000 + random() ** 2 * 280000),
    is_bot: false,
  };

  let row;
  if (kind === 'reader') {
    const visitor = visitors[Math.floor(Math.pow(random(), 1.3) * visitors.length)];
    const first = !seenReader.has(visitor.id);
    seenReader.add(visitor.id);
    row = {
      ...base,
      visitor_id: visitor.id,
      country: visitor.country,
      region: visitor.region,
      city: visitor.city,
      asn: visitor.asn,
      as_org: visitor.org,
      tz: visitor.tz,
      browser: visitor.browser,
      os: visitor.os,
      device: visitor.device,
      screen: visitor.screen,
      lang: visitor.lang,
      utm_campaign: '',
      utm_medium: '',
      ...(measured ? { ...readerSignals(visitor, first), ua: userAgent(visitor) } : NOT_MEASURED),
    };
    if (measured && row.utm_source) row.utm_medium = 'referral';
  } else if (kind === 'crawler') {
    const place = pick(CRAWLER_PLACES.map((p) => [p, 1]));
    row = {
      ...base,
      visitor_id: randomId(),
      path: pick(LIST_PATHS.map((p) => [p, 1])),
      referrer: '',
      duration_ms: null,
      country: place.country,
      region: place.region,
      city: place.city,
      asn: place.asn,
      as_org: place.org,
      tz: place.tz,
      browser: 'Chrome',
      os: 'Windows',
      device: 'desktop',
      screen: '1920x1080',
      lang: 'en-US',
      utm_campaign: '',
      utm_medium: '',
      ...(measured
        ? {
            viewport: '1920x947',
            dpr: '1',
            touch: 0,
            nav: 'navigate',
            utm_source: '',
            automation: chance(0.5),
            interacted: false,
            scroll_pct: pick([
              [100, 1],
              [14, 1],
            ]),
            ua: userAgent({ browser: 'Chrome', os: 'Windows' }),
          }
        : NOT_MEASURED),
    };
  } else if (kind === 'flagged') {
    row = {
      ...base,
      visitor_id: randomId(),
      referrer: '',
      duration_ms: 5400,
      is_bot: true,
      country: 'US',
      region: 'Virginia',
      city: 'Boydton',
      asn: 8075,
      as_org: 'Microsoft Corporation',
      tz: 'America/Chicago',
      browser: 'Chrome',
      os: 'Other',
      device: 'desktop',
      screen: '800x600',
      lang: 'en-US',
      utm_campaign: '',
      utm_medium: '',
      ...(measured
        ? {
            viewport: '800x600',
            dpr: '1',
            touch: 0,
            nav: 'navigate',
            utm_source: '',
            automation: true,
            interacted: false,
            scroll_pct: 100,
            ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/124.0.0.0 Safari/537.36',
          }
        : NOT_MEASURED),
    };
  } else {
    row = {
      ...base,
      visitor_id: randomId(),
      path: '/posts/waline/',
      referrer: '',
      duration_ms: 26000,
      country: 'US',
      region: 'California',
      city: 'East Los Angeles',
      asn: 13335,
      as_org: 'OpenAI',
      tz: 'America/Los_Angeles',
      browser: 'Chrome',
      os: 'Linux',
      device: 'desktop',
      screen: '1364x1024',
      lang: 'en',
      utm_campaign: '',
      utm_medium: '',
      ...(measured
        ? {
            viewport: '1364x1024',
            dpr: '1',
            touch: 0,
            nav: 'navigate',
            utm_source: '',
            automation: false,
            interacted: true,
            scroll_pct: 100,
            ua: userAgent({ browser: 'Chrome', os: 'Linux' }),
          }
        : NOT_MEASURED),
    };
  }
  rows.push(row);
}
rows.sort((a, b) => b.ts - a.ts);

const firstSeen = new Map();
for (const row of rows) firstSeen.set(row.visitor_id, Math.min(firstSeen.get(row.visitor_id) ?? Infinity, row.ts));
for (const row of rows) row.is_first = row.ts === firstSeen.get(row.visitor_id);

export { now, DAY, TOKYO, rows, firstSeen };
