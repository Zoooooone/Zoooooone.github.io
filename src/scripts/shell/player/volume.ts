/** iOS ignores writes to `volume` and always reports 1, so a slider would do nothing there. */
export function canSetVolume(media: { volume: number }) {
  const previous = media.volume;
  const probe = previous === 0.5 ? 0.25 : 0.5;
  media.volume = probe;
  const works = media.volume === probe;
  media.volume = previous;
  return works;
}
