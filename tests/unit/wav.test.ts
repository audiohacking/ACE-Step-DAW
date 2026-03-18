import { describe, expect, it } from 'vitest';
import { audioBufferToWavBlob } from '../../src/utils/wav';

function createAudioBufferMock(
  channels: number[][],
  sampleRate = 44100,
): AudioBuffer {
  return {
    numberOfChannels: channels.length,
    sampleRate,
    length: channels[0]?.length ?? 0,
    getChannelData: (channel: number) => Float32Array.from(channels[channel] ?? []),
  } as AudioBuffer;
}

function readAscii(view: DataView, start: number, length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += String.fromCharCode(view.getUint8(start + i));
  }
  return result;
}

describe('audioBufferToWavBlob', () => {
  it('creates a valid WAV header with RIFF, fmt, and data chunks', async () => {
    const audioBuffer = createAudioBufferMock([[0, 0.25, -0.25, 1]], 48000);

    const blob = audioBufferToWavBlob(audioBuffer);
    const arrayBuffer = await blob.arrayBuffer();
    const view = new DataView(arrayBuffer);

    expect(blob.type).toBe('audio/wav');
    expect(readAscii(view, 0, 4)).toBe('RIFF');
    expect(readAscii(view, 8, 4)).toBe('WAVE');
    expect(readAscii(view, 12, 4)).toBe('fmt ');
    expect(readAscii(view, 36, 4)).toBe('data');
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(48000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(8);
  });

  it('encodes samples as signed 16-bit PCM', async () => {
    const audioBuffer = createAudioBufferMock([[-1, -0.5, 0, 0.5, 1]]);

    const arrayBuffer = await audioBufferToWavBlob(audioBuffer).arrayBuffer();
    const view = new DataView(arrayBuffer);

    expect(view.getInt16(44, true)).toBe(-32768);
    expect(view.getInt16(46, true)).toBe(-16384);
    expect(view.getInt16(48, true)).toBe(0);
    expect(view.getInt16(50, true)).toBe(16383);
    expect(view.getInt16(52, true)).toBe(32767);
  });

  it('handles mono and stereo channel layouts correctly', async () => {
    const mono = createAudioBufferMock([[0.25, -0.25]]);
    const stereo = createAudioBufferMock([[0.25, -0.25], [-0.5, 0.5]]);

    const monoView = new DataView(await audioBufferToWavBlob(mono).arrayBuffer());
    const stereoView = new DataView(await audioBufferToWavBlob(stereo).arrayBuffer());

    expect(monoView.getUint16(22, true)).toBe(1);
    expect(monoView.getUint16(32, true)).toBe(2);
    expect(stereoView.getUint16(22, true)).toBe(2);
    expect(stereoView.getUint16(32, true)).toBe(4);

    expect(stereoView.getInt16(44, true)).toBe(8191);
    expect(stereoView.getInt16(46, true)).toBe(-16384);
    expect(stereoView.getInt16(48, true)).toBe(-8192);
    expect(stereoView.getInt16(50, true)).toBe(16383);
  });

  it('handles an empty buffer edge case', async () => {
    const audioBuffer = createAudioBufferMock([[]]);

    const arrayBuffer = await audioBufferToWavBlob(audioBuffer).arrayBuffer();
    const view = new DataView(arrayBuffer);

    expect(arrayBuffer.byteLength).toBe(44);
    expect(view.getUint32(4, true)).toBe(36);
    expect(view.getUint32(40, true)).toBe(0);
  });
});
