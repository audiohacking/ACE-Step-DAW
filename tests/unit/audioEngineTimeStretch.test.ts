import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Project } from '../../src/types/project';
import { useProjectStore } from '../../src/store/projectStore';
import {
  computeTimeStretchRate,
  computeStretchedAudioParams,
} from '../../src/utils/timeStretch';

vi.mock('../../src/services/projectStorage', () => ({
  saveProject: vi.fn(),
}));

function makeProject(): Project {
  return {
    id: 'project-1',
    name: 'Test Project',
    createdAt: 1,
    updatedAt: 1,
    bpm: 120,
    keyScale: 'C major',
    timeSignature: 4,
    totalDuration: 128,
    measures: 64,
    tracks: [
      {
        id: 'track-1',
        trackName: 'vocals',
        displayName: 'Vocals',
        color: '#ff0000',
        order: 0,
        volume: 0.8,
        muted: false,
        soloed: false,
        clips: [
          {
            id: 'clip-1',
            trackId: 'track-1',
            startTime: 0,
            duration: 4,
            prompt: 'test',
            lyrics: '',
            generationStatus: 'ready',
            generationJobId: null,
            cumulativeMixKey: null,
            isolatedAudioKey: null,
            waveformPeaks: null,
            source: 'uploaded',
          },
        ],
      },
    ],
    generationDefaults: {
      inferenceSteps: 20,
      guidanceScale: 7.5,
      shift: 0,
      thinking: false,
      model: 'test-model',
    },
    globalCaption: '',
  };
}

describe('computeTimeStretchRate', () => {
  it('returns the ratio of project BPM to source BPM', () => {
    expect(computeTimeStretchRate(100, 120)).toBeCloseTo(1.2);
  });

  it('returns 1 when BPMs match', () => {
    expect(computeTimeStretchRate(120, 120)).toBe(1);
  });

  it('returns < 1 when project BPM is slower', () => {
    expect(computeTimeStretchRate(140, 70)).toBeCloseTo(0.5);
  });

  it('throws for zero/negative source BPM', () => {
    expect(() => computeTimeStretchRate(0, 120)).toThrow();
    expect(() => computeTimeStretchRate(-10, 120)).toThrow();
  });
});

describe('computeStretchedAudioParams', () => {
  it('scales audio duration by playback rate for a full clip', () => {
    const result = computeStretchedAudioParams({
      audioOffset: 0,
      clipDuration: 4,
      timeStretchRate: 2.0,
      seekOffset: 0,
    });
    expect(result.audioOffset).toBe(0);
    expect(result.audioDuration).toBe(8);
  });

  it('returns original values when rate is 1', () => {
    const result = computeStretchedAudioParams({
      audioOffset: 1,
      clipDuration: 4,
      timeStretchRate: 1,
      seekOffset: 0,
    });
    expect(result.audioOffset).toBe(1);
    expect(result.audioDuration).toBe(4);
  });

  it('adjusts for seeking into a stretched clip at half speed', () => {
    const result = computeStretchedAudioParams({
      audioOffset: 0,
      clipDuration: 4,
      timeStretchRate: 0.5,
      seekOffset: 2,
    });
    // At 0.5x, 2s of timeline consumes 1s of audio buffer
    expect(result.audioOffset).toBe(1);
    expect(result.audioDuration).toBe(1);
  });

  it('defaults rate to 1 when undefined', () => {
    const result = computeStretchedAudioParams({
      audioOffset: 0,
      clipDuration: 4,
      timeStretchRate: undefined,
      seekOffset: 0,
    });
    expect(result.audioOffset).toBe(0);
    expect(result.audioDuration).toBe(4);
  });

  it('handles audioOffset + seek correctly at double speed', () => {
    const result = computeStretchedAudioParams({
      audioOffset: 2,
      clipDuration: 4,
      timeStretchRate: 2.0,
      seekOffset: 1,
    });
    // seekAudio = 1 * 2 = 2, so audioOffset = 2 + 2 = 4
    // remainingAudio = (4 - 1) * 2 = 6
    expect(result.audioOffset).toBe(4);
    expect(result.audioDuration).toBe(6);
  });
});

describe('Store: setClipTimeStretch', () => {
  beforeEach(() => {
    useProjectStore.getState().setProject(makeProject());
  });

  it('updates timeStretchRate on the clip', () => {
    useProjectStore.getState().setClipTimeStretch('clip-1', 1.5);
    const clip = useProjectStore.getState().project!.tracks[0].clips[0];
    expect(clip.timeStretchRate).toBe(1.5);
  });

  it('resets to original speed with rate 1', () => {
    useProjectStore.getState().setClipTimeStretch('clip-1', 2.0);
    useProjectStore.getState().setClipTimeStretch('clip-1', 1.0);
    const clip = useProjectStore.getState().project!.tracks[0].clips[0];
    expect(clip.timeStretchRate).toBe(1.0);
  });
});
