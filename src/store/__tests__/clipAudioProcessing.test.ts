import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore } from '../projectStore';

vi.mock('../../services/projectStorage', () => ({
  saveProject: vi.fn(),
}));

vi.mock('../../services/audioFileManager', () => ({
  loadAudioBlobByKey: vi.fn(),
  saveAudioBlob: vi.fn(),
}));

vi.mock('../../hooks/useAudioEngine', () => ({
  getAudioEngine: vi.fn(),
}));

import { loadAudioBlobByKey, saveAudioBlob } from '../../services/audioFileManager';
import { getAudioEngine } from '../../hooks/useAudioEngine';

function fakeAudioBuffer(samples: Float32Array, sampleRate: number = 48000) {
  return {
    numberOfChannels: 1,
    sampleRate,
    length: samples.length,
    duration: samples.length / sampleRate,
    getChannelData: (ch: number) => {
      if (ch !== 0) throw new Error('only channel 0');
      return samples;
    },
  } as unknown as AudioBuffer;
}

describe('clip audio processing store actions', () => {
  let clipId: string;
  let trackId: string;

  beforeEach(() => {
    vi.clearAllMocks();
    useProjectStore.setState({ project: null });
    useProjectStore.getState().createProject();
    const track = useProjectStore.getState().addTrack('stems');
    trackId = track.id;
    const clip = useProjectStore.getState().addClip(trackId, {
      startTime: 0, duration: 2, prompt: 'test', lyrics: '',
    });
    clipId = clip.id;
    useProjectStore.getState().updateClip(clipId, {
      audioDuration: 2,
      audioOffset: 0,
      generationStatus: 'ready',
      isolatedAudioKey: 'audio:test:clip:isolated:123',
      waveformPeaks: [0.1, 0.2, 0.3],
    });

    const samples = new Float32Array([0.1, 0.2, 0.5, 0.3]);
    const buffer = fakeAudioBuffer(samples);
    const fakeBlob = new Blob(['audio'], { type: 'audio/wav' });

    (loadAudioBlobByKey as ReturnType<typeof vi.fn>).mockResolvedValue(fakeBlob);
    (saveAudioBlob as ReturnType<typeof vi.fn>).mockResolvedValue('audio:test:clip:isolated:new');
    (getAudioEngine as ReturnType<typeof vi.fn>).mockReturnValue({
      decodeAudioData: vi.fn().mockResolvedValue(buffer),
    });
  });

  describe('reverseClip', () => {
    it('updates clip with new audio key and waveform peaks', async () => {
      await useProjectStore.getState().reverseClip(clipId);

      const clip = useProjectStore.getState().getClipById(clipId);
      expect(clip?.isolatedAudioKey).toBe('audio:test:clip:isolated:new');
      expect(clip?.waveformPeaks).toBeDefined();
      expect(clip?.waveformPeaks!.length).toBeGreaterThan(0);
    });

    it('saves new audio blob via audioFileManager', async () => {
      await useProjectStore.getState().reverseClip(clipId);

      expect(saveAudioBlob).toHaveBeenCalledTimes(1);
      expect((saveAudioBlob as ReturnType<typeof vi.fn>).mock.calls[0][2]).toBe('isolated');
    });

    it('does nothing for clips without audio', async () => {
      useProjectStore.getState().updateClip(clipId, {
        isolatedAudioKey: null,
        cumulativeMixKey: null,
      });

      await useProjectStore.getState().reverseClip(clipId);

      expect(saveAudioBlob).not.toHaveBeenCalled();
    });

    it('does nothing for non-ready clips', async () => {
      useProjectStore.getState().updateClip(clipId, {
        generationStatus: 'pending',
      });

      await useProjectStore.getState().reverseClip(clipId);

      expect(saveAudioBlob).not.toHaveBeenCalled();
    });
  });

  describe('normalizeClip', () => {
    it('updates clip with normalized audio', async () => {
      await useProjectStore.getState().normalizeClip(clipId);

      const clip = useProjectStore.getState().getClipById(clipId);
      expect(clip?.isolatedAudioKey).toBe('audio:test:clip:isolated:new');
      expect(clip?.waveformPeaks).toBeDefined();
    });

    it('saves audio through audioFileManager', async () => {
      await useProjectStore.getState().normalizeClip(clipId);

      expect(saveAudioBlob).toHaveBeenCalledTimes(1);
    });
  });

  describe('adjustClipGain', () => {
    it('applies gain adjustment and updates clip', async () => {
      await useProjectStore.getState().adjustClipGain(clipId, 3);

      const clip = useProjectStore.getState().getClipById(clipId);
      expect(clip?.isolatedAudioKey).toBe('audio:test:clip:isolated:new');
      expect(clip?.waveformPeaks).toBeDefined();
    });

    it('saves audio through audioFileManager', async () => {
      await useProjectStore.getState().adjustClipGain(clipId, -6);

      expect(saveAudioBlob).toHaveBeenCalledTimes(1);
    });

    it('does nothing for clips without audio', async () => {
      useProjectStore.getState().updateClip(clipId, {
        isolatedAudioKey: null,
        cumulativeMixKey: null,
      });

      await useProjectStore.getState().adjustClipGain(clipId, 3);

      expect(saveAudioBlob).not.toHaveBeenCalled();
    });
  });
});
