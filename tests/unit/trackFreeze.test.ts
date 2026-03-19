import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '../../src/types/project';
import { useProjectStore } from '../../src/store/projectStore';

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
    tracks: [],
    generationDefaults: {
      inferenceSteps: 20,
      guidanceScale: 7.5,
      shift: 0,
      thinking: false,
      model: 'test-model',
    },
    globalCaption: '',
    automationLanes: [],
    assets: [],
  };
}

describe('track freeze / unfreeze', () => {
  beforeEach(() => {
    localStorage.clear();
    useProjectStore.setState(useProjectStore.getInitialState(), true);
  });

  it('freezeTrack sets frozen=true on the target track', () => {
    const store = useProjectStore.getState();
    store.setProject(makeProject());
    const track = store.addTrack('drums');

    useProjectStore.getState().freezeTrack(track.id);

    const updated = useProjectStore.getState().project!.tracks.find((t) => t.id === track.id)!;
    expect(updated.frozen).toBe(true);
  });

  it('unfreezeTrack sets frozen=false and clears frozenAudioKey', () => {
    const store = useProjectStore.getState();
    store.setProject(makeProject());
    const track = store.addTrack('vocals');

    // Simulate a frozen track with audio key
    useProjectStore.getState().freezeTrack(track.id);
    // Manually set frozenAudioKey to simulate bounce
    useProjectStore.setState({
      project: {
        ...useProjectStore.getState().project!,
        tracks: useProjectStore.getState().project!.tracks.map((t) =>
          t.id === track.id ? { ...t, frozenAudioKey: 'audio-key-123' } : t,
        ),
      },
    });

    useProjectStore.getState().unfreezeTrack(track.id);

    const updated = useProjectStore.getState().project!.tracks.find((t) => t.id === track.id)!;
    expect(updated.frozen).toBe(false);
    expect(updated.frozenAudioKey).toBeUndefined();
  });
});
