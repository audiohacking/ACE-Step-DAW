import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '../../src/store/projectStore';

describe('Comping / takes', () => {
  beforeEach(() => {
    const store = useProjectStore.getState();
    store.createProject({ name: 'Comping Test' });
    store.addTrack('vocals', 'stems');
  });

  it('addTake appends a take to the clip', () => {
    const store = useProjectStore.getState();
    const track = store.project!.tracks[0];
    const clip = store.addClip(track.id, {
      startTime: 0,
      duration: 4,
      prompt: 'vocal',
      lyrics: '',
    });
    store.addTake(clip.id, 'audio-key-1');
    const updated = useProjectStore.getState().getClipById(clip.id)!;
    expect(updated.takes).toHaveLength(1);
    expect(updated.takes![0].audioKey).toBe('audio-key-1');
    expect(updated.takes![0].selected).toBe(false);
  });

  it('selectTake marks only the chosen take as selected', () => {
    const store = useProjectStore.getState();
    const track = store.project!.tracks[0];
    const clip = store.addClip(track.id, {
      startTime: 0,
      duration: 4,
      prompt: 'vocal',
      lyrics: '',
    });
    store.addTake(clip.id, 'audio-key-1');
    store.addTake(clip.id, 'audio-key-2');
    const takes = useProjectStore.getState().getClipById(clip.id)!.takes!;
    expect(takes).toHaveLength(2);

    store.selectTake(clip.id, takes[1].id);
    const after = useProjectStore.getState().getClipById(clip.id)!.takes!;
    expect(after[0].selected).toBe(false);
    expect(after[1].selected).toBe(true);
  });
});
