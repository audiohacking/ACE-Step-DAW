import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProjectStore } from '../projectStore';
import { useGenerationStore } from '../generationStore';

vi.mock('../../services/projectStorage', () => ({
  saveProject: vi.fn(),
}));

vi.mock('../../constants/defaults', async () => {
  const actual = await vi.importActual<typeof import('../../constants/defaults')>('../../constants/defaults');
  return {
    ...actual,
    POLL_INTERVAL_MS: 0,
    MAX_POLL_DURATION_MS: 10,
  };
});

const mockReleaseStemSeparationTask = vi.fn();
const mockQueryResult = vi.fn();
const mockDownloadAudio = vi.fn();

vi.mock('../../services/aceStepApi', () => ({
  releaseStemSeparationTask: (...args: unknown[]) => mockReleaseStemSeparationTask(...args),
  queryResult: (...args: unknown[]) => mockQueryResult(...args),
  downloadAudio: (...args: unknown[]) => mockDownloadAudio(...args),
}));

const mockSaveAudioBlob = vi.fn();
const mockLoadAudioBlobByKey = vi.fn();

vi.mock('../../services/audioFileManager', () => ({
  saveAudioBlob: (...args: unknown[]) => mockSaveAudioBlob(...args),
  loadAudioBlobByKey: (...args: unknown[]) => mockLoadAudioBlobByKey(...args),
}));

const mockComputeWaveformPeaks = vi.fn(() => [0.1, 0.2, 0.3]);
vi.mock('../../utils/waveformPeaks', () => ({
  computeWaveformPeaks: (...args: unknown[]) => mockComputeWaveformPeaks(...args),
}));

const mockAudioBufferToWavBlob = vi.fn(() => new Blob(['wav-data'], { type: 'audio/wav' }));
vi.mock('../../utils/wav', () => ({
  audioBufferToWavBlob: (...args: unknown[]) => mockAudioBufferToWavBlob(...args),
}));

const mockToastInfo = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('../../hooks/useToast', () => ({
  toastInfo: (...args: unknown[]) => mockToastInfo(...args),
  toastSuccess: (...args: unknown[]) => mockToastSuccess(...args),
  toastError: (...args: unknown[]) => mockToastError(...args),
}));

function createMockAudioBuffer(duration = 8, sampleRate = 44100): AudioBuffer {
  const length = Math.ceil(duration * sampleRate);
  const channelData = new Float32Array(length);
  return {
    duration,
    sampleRate,
    length,
    numberOfChannels: 2,
    getChannelData: () => channelData,
    copyFromChannel: vi.fn(),
    copyToChannel: vi.fn(),
  } as unknown as AudioBuffer;
}

const mockDecodeAudioData = vi.fn();
vi.mock('../../hooks/useAudioEngine', () => ({
  getAudioEngine: () => ({
    decodeAudioData: (...args: unknown[]) => mockDecodeAudioData(...args),
  }),
}));

describe('projectStore separateStems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProjectStore.setState({ project: null });
    const genInitial = useGenerationStore.getInitialState?.() ?? { jobs: [], isGenerating: false, promptHistory: [] };
    useGenerationStore.setState(genInitial, true);
    mockLoadAudioBlobByKey.mockImplementation(async (key: string) => {
      if (key === 'source-audio-key') {
        return new Blob(['source-audio'], { type: 'audio/wav' });
      }
      return undefined;
    });
    mockSaveAudioBlob.mockImplementation(async (_projectId: string, clipId: string) => `saved-${clipId}`);
    mockDecodeAudioData.mockResolvedValue(createMockAudioBuffer());
  });

  function createReadySourceClip() {
    useProjectStore.getState().createProject({ name: 'Stem Test' });
    const track = useProjectStore.getState().addTrack('custom', 'sample');
    const clip = useProjectStore.getState().addClip(track.id, {
      startTime: 12,
      duration: 8,
      prompt: 'Imported mix',
      lyrics: '',
      source: 'uploaded',
    });
    useProjectStore.getState().updateClipStatus(clip.id, 'ready', {
      isolatedAudioKey: 'source-audio-key',
      waveformPeaks: [0.5, 0.25],
      audioDuration: 8,
      audioOffset: 0,
      source: 'uploaded',
    });
    return { track, clip };
  }

  it('creates aligned sample tracks for a 4-stem separation result', async () => {
    const { clip } = createReadySourceClip();

    mockReleaseStemSeparationTask.mockResolvedValue({ task_id: 'stem-job', status: 'queued' });
    mockQueryResult.mockResolvedValue([{
      task_id: 'stem-job',
      status: 1,
      result: JSON.stringify([
        { stem: 'vocals', file: '/vocals.wav' },
        { stem: 'drums', file: '/drums.wav' },
        { stem: 'bass', file: '/bass.wav' },
        { stem: 'other', file: '/other.wav' },
      ]),
      progress_text: '100%',
    }]);
    mockDownloadAudio.mockImplementation(async (path: string) => new Blob([path], { type: 'audio/wav' }));

    const newTracks = await useProjectStore.getState().separateStems(clip.id, 4);

    expect(newTracks).toHaveLength(4);
    expect(newTracks?.map((track) => track.displayName)).toEqual(['Vocals', 'Drums', 'Bass', 'Other']);
    expect(newTracks?.every((track) => track.trackType === 'sample')).toBe(true);

    const clips = newTracks?.map((track) => track.clips[0]) ?? [];
    expect(clips.every((createdClip) => createdClip.startTime === 12)).toBe(true);
    expect(clips.every((createdClip) => createdClip.duration === 8)).toBe(true);
    expect(clips.every((createdClip) => createdClip.generationStatus === 'ready')).toBe(true);
    expect(clips.every((createdClip) => createdClip.source === 'uploaded')).toBe(true);

    const project = useProjectStore.getState().project!;
    expect(project.tracks).toHaveLength(5);
    expect(project.assets?.slice(-4).map((asset) => asset.trackDisplayName)).toEqual(['Vocals', 'Drums', 'Bass', 'Other']);
    expect(mockSaveAudioBlob).toHaveBeenCalledTimes(4);
    expect(useGenerationStore.getState().jobs[0]?.status).toBe('done');
    expect(mockToastSuccess).toHaveBeenCalledWith('Stem separation completed');
  });

  it('supports 6-stem object payloads and maps piano to a keyboard sample track', async () => {
    const { clip } = createReadySourceClip();

    mockReleaseStemSeparationTask.mockResolvedValue({ task_id: 'stem-job', status: 'queued' });
    mockQueryResult.mockResolvedValue([{
      task_id: 'stem-job',
      status: 1,
      result: JSON.stringify({
        stems: {
          vocals: '/vocals.wav',
          drums: '/drums.wav',
          bass: '/bass.wav',
          guitar: '/guitar.wav',
          piano: '/piano.wav',
          other: '/other.wav',
        },
      }),
      progress_text: 'done',
    }]);
    mockDownloadAudio.mockImplementation(async (path: string) => new Blob([path], { type: 'audio/wav' }));

    const newTracks = await useProjectStore.getState().separateStems(clip.id, 6);

    expect(newTracks?.map((track) => `${track.displayName}:${track.trackName}`)).toEqual([
      'Vocals:vocals',
      'Drums:drums',
      'Bass:bass',
      'Guitar:guitar',
      'Piano:keyboard',
      'Other:custom',
    ]);
  });

  it('surfaces errors without mutating project tracks', async () => {
    const { clip } = createReadySourceClip();

    mockReleaseStemSeparationTask.mockResolvedValue({ task_id: 'stem-job', status: 'queued' });
    mockQueryResult.mockResolvedValue([{
      task_id: 'stem-job',
      status: 2,
      result: 'backend error',
      progress_text: 'failed',
    }]);

    await expect(useProjectStore.getState().separateStems(clip.id, 4)).rejects.toThrow('Stem separation failed: backend error');

    expect(useProjectStore.getState().project?.tracks).toHaveLength(1);
    expect(useGenerationStore.getState().jobs[0]?.status).toBe('error');
    expect(mockToastError).toHaveBeenCalled();
  });
});
