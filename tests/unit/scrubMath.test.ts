import { describe, expect, it } from 'vitest';
import { clampScrubPreviewRate, getScrubPreviewRate } from '../../src/utils/scrubMath';

describe('scrubMath', () => {
  it('increases preview-rate magnitude as drag velocity increases', () => {
    const slow = getScrubPreviewRate({
      previousX: 100,
      nextX: 118,
      previousTime: 1,
      nextTime: 1.18,
      previousStamp: 0,
      nextStamp: 80,
    });
    const fast = getScrubPreviewRate({
      previousX: 100,
      nextX: 220,
      previousTime: 1,
      nextTime: 2.2,
      previousStamp: 0,
      nextStamp: 32,
    });

    expect(Math.abs(fast)).toBeGreaterThan(Math.abs(slow));
  });

  it('returns a negative preview rate when dragging backward', () => {
    const rate = getScrubPreviewRate({
      previousX: 220,
      nextX: 140,
      previousTime: 2.2,
      nextTime: 1.4,
      previousStamp: 0,
      nextStamp: 40,
    });

    expect(rate).toBeLessThan(0);
  });

  it('clamps preview rates to the supported scrub range', () => {
    expect(clampScrubPreviewRate(12)).toBe(4);
    expect(clampScrubPreviewRate(-12)).toBe(-4);
  });
});
