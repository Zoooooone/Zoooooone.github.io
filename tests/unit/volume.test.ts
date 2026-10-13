import { describe, expect, it } from 'vitest';
import { canSetVolume } from '@/scripts/shell/player/volume';

describe('canSetVolume', () => {
  it('is true when the element keeps the value it was given', () => {
    const media = { volume: 0.7 };
    expect(canSetVolume(media)).toBe(true);
    expect(media.volume).toBe(0.7);
  });

  it('is false when writes are ignored, as on iOS', () => {
    const media = {
      get volume() {
        return 1;
      },
      set volume(_v: number) {},
    };
    expect(canSetVolume(media)).toBe(false);
  });

  it('probes with a different value when the volume is already 0.5', () => {
    const media = { volume: 0.5 };
    expect(canSetVolume(media)).toBe(true);
    expect(media.volume).toBe(0.5);
  });
});
