import { describe, expect, it } from 'vitest';
import { computeWaveformPeaks } from '../../src/utils/waveformPeaks';

function createAudioBufferMock(samples: number[]): AudioBuffer {
  return {
    getChannelData: () => Float32Array.from(samples),
  } as AudioBuffer;
}

describe('computeWaveformPeaks', () => {
  it('returns the requested number of peaks', () => {
    const peaks = computeWaveformPeaks(
      createAudioBufferMock([0.1, -0.2, 0.5, -0.7, 0.9, -0.4, 0.3, -0.1]),
      4,
    );

    expect(peaks).toHaveLength(4);
    expect(peaks).toEqual([0.2, 0.7, 0.9, 0.3]);
  });

  it('keeps peak values between 0 and 1 for normalized source audio', () => {
    const peaks = computeWaveformPeaks(
      createAudioBufferMock([-1, -0.25, 0.75, 0.5, -0.9, 0.1]),
      3,
    );

    expect(peaks.every((peak) => peak >= -1 && peak <= 1)).toBe(true);
  });

  it('returns all zeros for a silent buffer', () => {
    const peaks = computeWaveformPeaks(createAudioBufferMock([0, 0, 0, 0]), 4);

    expect(peaks).toEqual([0, 0, 0, 0]);
  });

  it('returns zeros when a single sample is spread across multiple requested peaks', () => {
    const peaks = computeWaveformPeaks(createAudioBufferMock([0.75]), 4);

    expect(peaks).toEqual([0, 0, 0, 0]);
  });
});
