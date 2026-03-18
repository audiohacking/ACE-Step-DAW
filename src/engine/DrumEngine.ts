import * as Tone from 'tone';
import type { DrumKitName } from '../types/project';

interface DrumVoice {
  trigger: (time?: number, velocity?: number) => void;
  dispose: () => void;
}

function createKick(): DrumVoice {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.08,
    octaves: 6,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.45, sustain: 0, release: 0.4 },
  }).toDestination();
  return { trigger: (time, vel = 1) => synth.triggerAttackRelease('C1', '8n', time, vel), dispose: () => synth.dispose() };
}

function createSnare(): DrumVoice {
  const synth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 0.12 },
  }).toDestination();
  return { trigger: (time, vel = 1) => synth.triggerAttackRelease('16n', time, vel * 0.85), dispose: () => synth.dispose() };
}

function createClosedHat(): DrumVoice {
  const synth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
  }).toDestination();
  return { trigger: (time, vel = 1) => synth.triggerAttackRelease('32n', time, vel * 0.6), dispose: () => synth.dispose() };
}

function createOpenHat(): DrumVoice {
  const synth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.18 },
  }).toDestination();
  return { trigger: (time, vel = 1) => synth.triggerAttackRelease('8n', time, vel * 0.5), dispose: () => synth.dispose() };
}

function createClap(): DrumVoice {
  const synth = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.08 },
  }).toDestination();
  return { trigger: (time, vel = 1) => synth.triggerAttackRelease('16n', time, vel * 0.8), dispose: () => synth.dispose() };
}

function createTom(note: string): DrumVoice {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.04,
    octaves: 3,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.15 },
  }).toDestination();
  return { trigger: (time, vel = 1) => synth.triggerAttackRelease(note, '8n', time, vel), dispose: () => synth.dispose() };
}

function createMetal(frequency: number): DrumVoice {
  const synth = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.18, release: 0.08 },
    harmonicity: 4,
    modulationIndex: 12,
    resonance: 5000,
    octaves: 1,
  }).toDestination();
  return { trigger: (time, vel = 1) => synth.triggerAttackRelease(frequency, '16n', time, vel * 0.6), dispose: () => synth.dispose() };
}

const PAD_FACTORIES: Array<() => DrumVoice> = [
  createKick,
  createSnare,
  createClosedHat,
  createOpenHat,
  createClap,
  () => createMetal(420),
  () => createTom('D2'),
  () => createTom('G2'),
  () => createMetal(260),
  () => createMetal(420),
  () => createClap(),
  () => createMetal(560),
  () => createTom('A2'),
  () => createTom('D3'),
  () => createClap(),
  () => createMetal(220),
];

class DrumEngine {
  private tracks = new Map<string, DrumVoice[]>();

  async ensureStarted() {
    if (Tone.getContext().state !== 'running') {
      await Tone.start();
    }
  }

  async ensureTrack(trackId: string, _kit: DrumKitName) {
    await this.ensureStarted();
    if (this.tracks.has(trackId)) return;
    this.tracks.set(trackId, PAD_FACTORIES.map((factory) => factory()));
  }

  async triggerPad(trackId: string, padIndex: number, velocity = 100, kit: DrumKitName = '808') {
    await this.ensureTrack(trackId, kit);
    const voices = this.tracks.get(trackId);
    const voice = voices?.[padIndex];
    voice?.trigger(undefined, velocity / 127);
  }

  disposeTrack(trackId: string) {
    const voices = this.tracks.get(trackId);
    if (!voices) return;
    for (const voice of voices) voice.dispose();
    this.tracks.delete(trackId);
  }

  dispose() {
    for (const trackId of this.tracks.keys()) {
      this.disposeTrack(trackId);
    }
  }
}

export const drumEngine = new DrumEngine();
