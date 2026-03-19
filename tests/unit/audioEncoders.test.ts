import { describe, expect, it } from 'vitest';
import {
  floatToInt16,
  encodeToMp3,
  encodeToFlac,
  estimateFileSize,
  formatFileSize,
  type ExportOptions,
} from '../../src/utils/audioEncoders';

/**
 * Create a mock AudioBuffer for testing.
 * Generates a simple sine wave.
 */
function createMockAudioBuffer(
  lengthInSamples: number,
  sampleRate: number,
  channels: number = 2,
): AudioBuffer {
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < channels; ch++) {
    const data = new Float32Array(lengthInSamples);
    for (let i = 0; i < lengthInSamples; i++) {
      data[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.5;
    }
    channelData.push(data);
  }

  return {
    numberOfChannels: channels,
    sampleRate,
    length: lengthInSamples,
    duration: lengthInSamples / sampleRate,
    getChannelData: (ch: number) => channelData[ch],
  } as unknown as AudioBuffer;
}

describe('floatToInt16', () => {
  it('converts float samples to Int16 range', () => {
    const input = new Float32Array([0, 1, -1, 0.5, -0.5]);
    const result = floatToInt16(input);

    expect(result).toBeInstanceOf(Int16Array);
    expect(result.length).toBe(5);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(0x7fff); // max positive
    expect(result[2]).toBe(-0x8000); // max negative
    expect(result[3]).toBeGreaterThan(0);
    expect(result[4]).toBeLessThan(0);
  });

  it('clamps values outside -1..1', () => {
    const input = new Float32Array([1.5, -1.5]);
    const result = floatToInt16(input);

    expect(result[0]).toBe(0x7fff);
    expect(result[1]).toBe(-0x8000);
  });
});

describe('encodeToMp3', () => {
  it('produces a Blob with audio/mpeg type', () => {
    const buffer = createMockAudioBuffer(4410, 44100, 2);
    const blob = encodeToMp3(buffer, 128);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('audio/mpeg');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('accepts different bitrates', () => {
    const buffer = createMockAudioBuffer(4410, 44100, 2);
    const blob128 = encodeToMp3(buffer, 128);
    const blob320 = encodeToMp3(buffer, 320);

    expect(blob128.size).toBeGreaterThan(0);
    expect(blob320.size).toBeGreaterThan(0);
    // Higher bitrate should generally produce larger files
    // (for very short audio this might not always hold, so just check both are valid)
  });

  it('handles mono audio', () => {
    const buffer = createMockAudioBuffer(4410, 44100, 1);
    const blob = encodeToMp3(buffer, 192);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });
});

describe('encodeToFlac', () => {
  it('produces a Blob with audio/flac type', () => {
    const buffer = createMockAudioBuffer(4410, 44100, 2);
    const blob = encodeToFlac(buffer, 16);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('audio/flac');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('starts with fLaC magic bytes', async () => {
    const buffer = createMockAudioBuffer(4410, 44100, 2);
    const blob = encodeToFlac(buffer, 16);
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // fLaC magic number
    expect(bytes[0]).toBe(0x66); // f
    expect(bytes[1]).toBe(0x4c); // L
    expect(bytes[2]).toBe(0x61); // a
    expect(bytes[3]).toBe(0x43); // C
  });

  it('contains STREAMINFO metadata block', async () => {
    const buffer = createMockAudioBuffer(4410, 44100, 2);
    const blob = encodeToFlac(buffer, 16);
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // After magic (4 bytes), metadata block header
    // First byte: 0x80 = last metadata block flag | block type 0 (STREAMINFO)
    expect(bytes[4]).toBe(0x80);
    // Next 3 bytes: length = 34 (0x000022)
    expect(bytes[5]).toBe(0x00);
    expect(bytes[6]).toBe(0x00);
    expect(bytes[7]).toBe(0x22);
  });

  it('supports 24-bit encoding', () => {
    const buffer = createMockAudioBuffer(4410, 44100, 2);
    const blob16 = encodeToFlac(buffer, 16);
    const blob24 = encodeToFlac(buffer, 24);

    expect(blob24.size).toBeGreaterThan(blob16.size);
  });

  it('handles mono audio', () => {
    const buffer = createMockAudioBuffer(4410, 44100, 1);
    const blob = encodeToFlac(buffer, 16);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });
});

describe('estimateFileSize', () => {
  it('estimates WAV size correctly', () => {
    const size = estimateFileSize(60, 48000, 2, {
      format: 'wav',
      bitDepth: 16,
      mp3Bitrate: 320,
    });

    // 60s * 48000 * 2ch * 2 bytes + 44 header = 11,520,044
    expect(size).toBe(11520044);
  });

  it('estimates MP3 size based on bitrate', () => {
    const size = estimateFileSize(60, 48000, 2, {
      format: 'mp3',
      bitDepth: 16,
      mp3Bitrate: 320,
    });

    // 60s * 320000 bps / 8 = 2,400,000
    expect(size).toBe(2400000);
  });

  it('estimates FLAC size smaller than WAV', () => {
    const wavSize = estimateFileSize(60, 48000, 2, {
      format: 'wav',
      bitDepth: 16,
      mp3Bitrate: 320,
    });
    const flacSize = estimateFileSize(60, 48000, 2, {
      format: 'flac',
      bitDepth: 16,
      mp3Bitrate: 320,
    });

    expect(flacSize).toBeLessThan(wavSize);
  });

  it('24-bit WAV is larger than 16-bit', () => {
    const size16 = estimateFileSize(60, 48000, 2, {
      format: 'wav',
      bitDepth: 16,
      mp3Bitrate: 320,
    });
    const size24 = estimateFileSize(60, 48000, 2, {
      format: 'wav',
      bitDepth: 24,
      mp3Bitrate: 320,
    });

    expect(size24).toBeGreaterThan(size16);
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('formats fractional megabytes', () => {
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });
});
