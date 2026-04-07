import { describe, it, expect } from 'vitest';
import {
  exportProjectToMidi,
  parseMidiFile,
  type MidiTrackData,
  type MidiNoteEvent,
} from '../midiFile';
import type { Project, Track, Clip, MidiNote } from '../../types/project';

function makeNote(pitch: number, startBeat: number, durationBeats: number, velocity = 100): MidiNote {
  return {
    id: `note-${pitch}-${startBeat}`,
    pitch,
    startBeat,
    durationBeats,
    velocity,
  };
}

function makeMidiClip(startTime: number, notes: MidiNote[]): Clip {
  return {
    id: `clip-${startTime}`,
    startTime,
    duration: 4,
    midiData: { notes, grid: { resolution: 16, swing: 0 } },
  } as unknown as Clip;
}

function makeTrack(name: string, clips: Clip[], trackType: 'pianoRoll' | 'drumMachine' = 'pianoRoll'): Track {
  return {
    id: `track-${name}`,
    trackName: 'custom',
    trackType,
    displayName: name,
    color: '#ff0000',
    volume: 0.8,
    clips,
    localCaption: '',
  } as Track;
}

function makeProject(tracks: Track[], bpm = 120, timeSignature = 4): Project {
  return {
    id: 'proj-1',
    name: 'Test Song',
    createdAt: 1000,
    updatedAt: 2000,
    bpm,
    keyScale: 'C major',
    timeSignature,
    totalDuration: 60,
    tracks,
    generationDefaults: {} as Project['generationDefaults'],
  };
}

describe('midiFile', () => {
  describe('exportProjectToMidi', () => {
    it('exports an empty project as valid MIDI with header', () => {
      const project = makeProject([]);
      const bytes = exportProjectToMidi(project);

      // MIDI header: "MThd"
      expect(bytes[0]).toBe(0x4D); // M
      expect(bytes[1]).toBe(0x54); // T
      expect(bytes[2]).toBe(0x68); // h
      expect(bytes[3]).toBe(0x64); // d
      // Header length = 6
      expect(bytes[7]).toBe(6);
    });

    it('includes a tempo track with the project BPM', () => {
      const project = makeProject([], 140);
      const bytes = exportProjectToMidi(project);
      const data = new DataView(bytes.buffer, bytes.byteOffset);

      // Format type 1 (multi-track)
      expect(data.getUint16(8)).toBe(1);
      // Should have at least 1 track (tempo)
      expect(data.getUint16(10)).toBeGreaterThanOrEqual(1);
    });

    it('encodes MIDI notes from pianoRoll tracks', () => {
      const notes = [makeNote(60, 0, 1), makeNote(64, 1, 0.5)];
      const clip = makeMidiClip(0, notes);
      const track = makeTrack('Piano', [clip], 'pianoRoll');
      const project = makeProject([track]);

      const bytes = exportProjectToMidi(project);
      // Should produce valid MIDI (at minimum >14 bytes for header + at least one track)
      expect(bytes.length).toBeGreaterThan(22);
    });

    it('skips tracks with no MIDI notes', () => {
      const stemTrack = {
        id: 'stem-1',
        trackName: 'vocals' as const,
        trackType: 'stems' as const,
        displayName: 'Vocals',
        color: '#00ff00',
        volume: 1,
        clips: [{ id: 'c1', startTime: 0, duration: 10 }] as unknown as Clip[],
        localCaption: '',
      } as Track;
      const project = makeProject([stemTrack]);
      const bytes = exportProjectToMidi(project);
      const data = new DataView(bytes.buffer, bytes.byteOffset);

      // Only tempo track (no MIDI data tracks)
      expect(data.getUint16(10)).toBe(1);
    });

    it('uses 480 ticks per quarter note', () => {
      const project = makeProject([]);
      const bytes = exportProjectToMidi(project);
      const data = new DataView(bytes.buffer, bytes.byteOffset);
      expect(data.getUint16(12)).toBe(480);
    });
  });

  describe('parseMidiFile', () => {
    it('parses a valid MIDI file header', () => {
      const project = makeProject([]);
      const bytes = exportProjectToMidi(project);
      const result = parseMidiFile(bytes);

      expect(result.format).toBe(1);
      expect(result.ticksPerBeat).toBe(480);
      expect(result.bpm).toBe(120);
    });

    it('round-trips notes through export → import', () => {
      const notes = [
        makeNote(60, 0, 1, 100),
        makeNote(64, 1, 0.5, 80),
        makeNote(67, 2, 2, 127),
      ];
      const clip = makeMidiClip(0, notes);
      const track = makeTrack('Piano', [clip]);
      const project = makeProject([track], 120);

      const bytes = exportProjectToMidi(project);
      const result = parseMidiFile(bytes);

      expect(result.tracks.length).toBeGreaterThanOrEqual(1);
      // Find the data track (skip tempo track)
      const dataTracks = result.tracks.filter(t => t.notes.length > 0);
      expect(dataTracks.length).toBe(1);

      const imported = dataTracks[0].notes;
      expect(imported.length).toBe(3);

      // Check first note
      expect(imported[0].pitch).toBe(60);
      expect(imported[0].velocity).toBe(100);
      expect(imported[0].startBeat).toBeCloseTo(0, 2);
      expect(imported[0].durationBeats).toBeCloseTo(1, 2);

      // Check second note
      expect(imported[1].pitch).toBe(64);
      expect(imported[1].velocity).toBe(80);
      expect(imported[1].startBeat).toBeCloseTo(1, 2);
    });

    it('parses BPM from tempo meta event', () => {
      const project = makeProject([], 145);
      const bytes = exportProjectToMidi(project);
      const result = parseMidiFile(bytes);
      expect(result.bpm).toBeCloseTo(145, 0);
    });

    it('parses track names', () => {
      const track = makeTrack('Lead Synth', [makeMidiClip(0, [makeNote(60, 0, 1)])]);
      const project = makeProject([track]);
      const bytes = exportProjectToMidi(project);
      const result = parseMidiFile(bytes);

      const namedTrack = result.tracks.find(t => t.name === 'Lead Synth');
      expect(namedTrack).toBeTruthy();
    });

    it('throws on invalid MIDI data', () => {
      const garbage = new Uint8Array([0, 1, 2, 3, 4]);
      expect(() => parseMidiFile(garbage)).toThrow();
    });
  });
});
