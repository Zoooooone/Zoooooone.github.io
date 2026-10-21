export interface Agent {
  browser: string;
  os: string;
  device: 'mobile' | 'tablet' | 'desktop';
  bot: boolean;
}

const BOT =
  /bot|crawl|spider|slurp|facebookexternalhit|headless|lighthouse|preview|monitor|curl|wget|python-requests|httpclient|go-http|axios|node-fetch/i;

// Order matters: Edge and Opera also say "Chrome", Chrome also says "Safari".
const BROWSERS: [string, RegExp][] = [
  ['Edge', /edg(?:e|a|ios)?\//i],
  ['Opera', /opr\/|opera/i],
  ['Firefox', /firefox|fxios/i],
  ['Chrome', /chrome|crios/i],
  ['Safari', /safari/i],
];

const SYSTEMS: [string, RegExp][] = [
  ['Android', /android/i],
  ['iOS', /iphone|ipad|ipod/i],
  ['Windows', /windows/i],
  ['macOS', /mac os x|macintosh/i],
  ['Linux', /linux|cros/i],
];

export function parseAgent(ua: string): Agent {
  const pick = (table: [string, RegExp][]) => table.find(([, re]) => re.test(ua))?.[0] ?? 'Other';
  const tablet = /ipad|tablet/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua));
  const mobile = /mobi|iphone|ipod/i.test(ua);
  return {
    browser: pick(BROWSERS),
    os: pick(SYSTEMS),
    device: tablet ? 'tablet' : mobile ? 'mobile' : 'desktop',
    bot: !ua || BOT.test(ua),
  };
}
