import { describe, expect, it } from 'vitest';
import { normalizePlaybackLatencySettings } from '../../src/utils/playbackLatency';

describe('normalizePlaybackLatencySettings', () => {
  it('sanitizes invalid detected latency fields from persisted data', () => {
    expect(
      normalizePlaybackLatencySettings({
        detectedBaseLatencyMs: Number.NaN,
        detectedOutputLatencyMs: Number.POSITIVE_INFINITY,
        detectedLatencyMs: 999,
        browserSupport: 'available',
      }),
    ).toMatchObject({
      detectedBaseLatencyMs: null,
      detectedOutputLatencyMs: null,
      detectedLatencyMs: 500,
      compensationMs: 500,
      browserSupport: 'available',
      source: 'auto',
    });
  });

  it('recomputes browser support from sanitized detected fields when the persisted flag is invalid', () => {
    expect(
      normalizePlaybackLatencySettings({
        detectedBaseLatencyMs: -12,
        detectedOutputLatencyMs: 8,
        browserSupport: 'broken' as never,
      }),
    ).toMatchObject({
      detectedBaseLatencyMs: 0,
      detectedOutputLatencyMs: 8,
      detectedLatencyMs: 8,
      compensationMs: 8,
      browserSupport: 'available',
      source: 'auto',
    });
  });
});
