import { describe, expect, it } from 'vitest';
import { DEAD_ZONE, EDGE, nextBarState } from '@/scripts/shell/bar-visibility';

const base = { viewport: 800, scrollHeight: 4000, hidden: false, pinned: false };

describe('bottom bar visibility', () => {
  it('hides after scrolling down past the dead zone', () => {
    const next = nextBarState({ ...base, y: 500, lastY: 500 - DEAD_ZONE - 1 });
    expect(next).toEqual({ hidden: true, lastY: 500 });
  });

  it('shows again after scrolling up', () => {
    const next = nextBarState({ ...base, hidden: true, y: 480, lastY: 500 });
    expect(next).toEqual({ hidden: false, lastY: 480 });
  });

  it('ignores jitter inside the dead zone and keeps the anchor', () => {
    const next = nextBarState({ ...base, hidden: true, y: 503, lastY: 500 });
    expect(next).toEqual({ hidden: true, lastY: 500 });
  });

  it('always shows at the top and at the bottom of the page', () => {
    expect(nextBarState({ ...base, hidden: true, y: EDGE - 1, lastY: 200 }).hidden).toBe(false);
    expect(nextBarState({ ...base, hidden: true, y: 4000 - 800, lastY: 3000 }).hidden).toBe(false);
  });

  it('stays visible while something pins it', () => {
    const next = nextBarState({ ...base, y: 900, lastY: 500, pinned: true });
    expect(next).toEqual({ hidden: false, lastY: 900 });
  });
});
