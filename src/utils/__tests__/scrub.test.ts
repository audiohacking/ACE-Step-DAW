import { describe, expect, it } from 'vitest';
import {
  getScrubPlaybackRate,
  getScrubSliceWindow,
  getScrubSourceOffset,
} from '../scrub';

describe('scrub utilities', () => {
  it('maps faster drag preview rates to faster playback rates', () => {
    expect(getScrubPlaybackRate(0.1)).toBeLessThan(getScrubPlaybackRate(0.85));
    expect(getScrubPlaybackRate(-0.85)).toBeCloseTo(getScrubPlaybackRate(0.85));
  });

  it('uses shorter scrub windows as playback speed increases', () => {
    expect(getScrubSliceWindow(0.2)).toBeGreaterThan(getScrubSliceWindow(0.9));
  });

  it('biases reverse scrubs earlier in the source audio', () => {
    const forwardOffset = getScrubSourceOffset({
      clipStartTime: 8,
      clipDuration: 4,
      timelineTime: 9.5,
      previewRate: 0.7,
      audioOffset: 0.25,
      timeStretchRate: 1,
    });
    const reverseOffset = getScrubSourceOffset({
      clipStartTime: 8,
      clipDuration: 4,
      timelineTime: 9.5,
      previewRate: -0.7,
      audioOffset: 0.25,
      timeStretchRate: 1,
    });

    expect(reverseOffset).toBeLessThan(forwardOffset);
    expect(reverseOffset).toBeGreaterThanOrEqual(0.25);
  });

  it('keeps stretched scrub offsets within source bounds when stretching longer', () => {
    const previewRate = 0.9;
    const stretchRate = 1.75;
    const offset = getScrubSourceOffset({
      clipStartTime: 8,
      clipDuration: 4,
      timelineTime: 11.95,
      previewRate,
      audioOffset: 0.5,
      timeStretchRate: stretchRate,
    });
    const sourceWindow = getScrubSliceWindow(previewRate) * getScrubPlaybackRate(previewRate) * stretchRate;
    const maxOffset = 0.5 + Math.max(0, 4 * stretchRate - sourceWindow);

    expect(offset).toBeLessThanOrEqual(maxOffset);
    expect(offset).toBeGreaterThanOrEqual(0.5);
  });

  it('applies reverse bias safely when stretching shorter', () => {
    const previewRate = -0.85;
    const stretchRate = 0.5;
    const reverseOffset = getScrubSourceOffset({
      clipStartTime: 2,
      clipDuration: 6,
      timelineTime: 2.1,
      previewRate,
      audioOffset: 1.25,
      timeStretchRate: stretchRate,
    });
    const forwardOffset = getScrubSourceOffset({
      clipStartTime: 2,
      clipDuration: 6,
      timelineTime: 2.1,
      previewRate: Math.abs(previewRate),
      audioOffset: 1.25,
      timeStretchRate: stretchRate,
    });
    const sourceWindow = getScrubSliceWindow(previewRate) * getScrubPlaybackRate(previewRate) * stretchRate;
    const maxOffset = 1.25 + Math.max(0, 6 * stretchRate - sourceWindow);

    expect(reverseOffset).toBeGreaterThanOrEqual(1.25);
    expect(reverseOffset).toBeLessThanOrEqual(maxOffset);
    expect(reverseOffset).toBeLessThanOrEqual(forwardOffset);
  });
});
