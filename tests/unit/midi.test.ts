import { describe, expect, it } from 'vitest';
import { parseMidiFile } from '../../src/utils/midi';

function textBytes(value: string) {
  return [...new TextEncoder().encode(value)];
}

function vlq(value: number): number[] {
  const buffer = [value & 0x7f];
  let remaining = value >> 7;

  while (remaining > 0) {
    buffer.unshift((remaining & 0x7f) | 0x80);
    remaining >>= 7;
  }

  return buffer;
}

function meta(delta: number, type: number, data: number[]) {
  return [...vlq(delta), 0xff, type, ...vlq(data.length), ...data];
}

function midi(delta: number, status: number, data: number[]) {
  return [...vlq(delta), status, ...data];
}

function trackChunk(events: number[]) {
  const bytes = Uint8Array.from(events);
  return [
    ...textBytes('MTrk'),
    (bytes.length >>> 24) & 0xff,
    (bytes.length >>> 16) & 0xff,
    (bytes.length >>> 8) & 0xff,
    bytes.length & 0xff,
    ...bytes,
  ];
}

function midiFile(format: number, tracks: number[][], division: number = 480) {
  const header = [
    ...textBytes('MThd'),
    0x00, 0x00, 0x00, 0x06,
    0x00, format,
    0x00, tracks.length,
    (division >>> 8) & 0xff,
    division & 0xff,
  ];
  return Uint8Array.from([
    ...header,
    ...tracks.flatMap((events) => trackChunk(events)),
  ]).buffer;
}

describe('parseMidiFile', () => {
  it('parses notes, tempo, time signature, and track names from a type 1 file', () => {
    const tempoTrack = [
      meta(0, 0x03, textBytes('Conductor')),
      meta(0, 0x51, [0x07, 0xa1, 0x20]), // 120 BPM
      meta(0, 0x58, [0x04, 0x02, 0x18, 0x08]), // 4/4
      meta(0, 0x2f, []),
    ].flat();

    const pianoTrack = [
      meta(0, 0x03, textBytes('Piano')),
      midi(0, 0x90, [60, 100]),
      midi(480, 0x80, [60, 0]),
      midi(0, 0x90, [64, 80]),
      midi(240, 0x80, [64, 0]),
      meta(0, 0x2f, []),
    ].flat();

    const parsed = parseMidiFile(midiFile(1, [tempoTrack, pianoTrack]));

    expect(parsed.bpm).toBe(120);
    expect(parsed.timeSignature).toEqual({ bar: 1, numerator: 4, denominator: 4 });
    expect(parsed.tracks).toHaveLength(1);
    expect(parsed.tracks[0].name).toBe('Piano');
    expect(parsed.tracks[0].notes).toEqual([
      { pitch: 60, startBeat: 0, durationBeats: 1, velocity: 100 / 127 },
      { pitch: 64, startBeat: 1, durationBeats: 0.5, velocity: 80 / 127 },
    ]);
  });

  it('splits a type 0 file into separate imported tracks by MIDI channel', () => {
    const mergedTrack = [
      meta(0, 0x03, textBytes('Merged')),
      midi(0, 0x90, [60, 96]),
      midi(0, 0x91, [67, 64]),
      midi(480, 0x80, [60, 0]),
      midi(0, 0x81, [67, 0]),
      meta(0, 0x2f, []),
    ].flat();

    const parsed = parseMidiFile(midiFile(0, [mergedTrack]));

    expect(parsed.tracks).toHaveLength(2);
    expect(parsed.tracks.map((track) => track.name)).toEqual(['Merged Ch 1', 'Merged Ch 2']);
    expect(parsed.tracks[0].channel).toBe(0);
    expect(parsed.tracks[1].channel).toBe(1);
    expect(parsed.tracks[0].notes[0]).toMatchObject({ pitch: 60, startBeat: 0, durationBeats: 1 });
    expect(parsed.tracks[1].notes[0]).toMatchObject({ pitch: 67, startBeat: 0, durationBeats: 1 });
  });
});
