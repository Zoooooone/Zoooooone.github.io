export type ThumbWidth = 800 | 1600 | 2560;

export function thumb(src: string | undefined, width: ThumbWidth = 800): string | undefined {
  if (!src) return src;
  const m = src.match(/^\/assets\/((?:img|src)\/.+\.(?:jpe?g|png|webp))$/i);
  return m ? `/assets/thumbs/${width}/${m[1]}.webp` : src;
}
