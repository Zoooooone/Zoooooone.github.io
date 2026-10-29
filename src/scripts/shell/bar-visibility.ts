export const DEAD_ZONE = 12;
export const EDGE = 32;

export type BarInput = {
  y: number;
  lastY: number;
  viewport: number;
  scrollHeight: number;
  hidden: boolean;
  /** Not a phone layout, or something (drawer, sheet, playlist, focus) needs the bar. */
  pinned: boolean;
};

/** `lastY` is the anchor the next scroll delta is measured from; it only moves once the dead zone is crossed. */
export function nextBarState({ y, lastY, viewport, scrollHeight, hidden, pinned }: BarInput) {
  const nearEdge = y < EDGE || y + viewport > scrollHeight - EDGE;
  if (pinned || nearEdge) return { hidden: false, lastY: y };
  const dy = y - lastY;
  if (Math.abs(dy) < DEAD_ZONE) return { hidden, lastY };
  return { hidden: dy > 0, lastY: y };
}
