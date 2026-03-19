import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore } from '../projectStore';

// Mock projectStorage to prevent IndexedDB calls during testing
vi.mock('../../services/projectStorage', () => ({
  saveProject: vi.fn(),
}));

/** Helper: create a project with one track and one clip */
function seedProjectWithClip(): { trackId: string; clipId: string } {
  const store = useProjectStore.getState();
  store.createProject();
  const track = store.addTrack('vocals');
  store.addClip(track.id, {
    startTime: 0,
    duration: 4,
    prompt: 'test vocal',
    lyrics: '',
  });
  const project = useProjectStore.getState().project!;
  const clipId = project.tracks[0].clips[0].id;
  return { trackId: track.id, clipId };
}

describe('Comping / Take Lanes', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: null });
  });

  describe('addTake + selectTake', () => {
    it('adds takes to a clip and selects one exclusively', () => {
      const { clipId } = seedProjectWithClip();

      // Initially no takes
      const initial = useProjectStore.getState().project!.tracks[0].clips[0];
      expect(initial.takes).toBeUndefined();

      // Add two takes
      useProjectStore.getState().addTake(clipId, 'audio-key-1');
      useProjectStore.getState().addTake(clipId, 'audio-key-2');

      const afterAdd = useProjectStore.getState().project!.tracks[0].clips[0];
      expect(afterAdd.takes).toHaveLength(2);
      expect(afterAdd.takes![0].audioKey).toBe('audio-key-1');
      expect(afterAdd.takes![1].audioKey).toBe('audio-key-2');
      expect(afterAdd.takes![0].selected).toBe(false);
      expect(afterAdd.takes![1].selected).toBe(false);

      // Select the second take — only it should be selected
      const takeId = afterAdd.takes![1].id;
      useProjectStore.getState().selectTake(clipId, takeId);

      const afterSelect = useProjectStore.getState().project!.tracks[0].clips[0];
      expect(afterSelect.takes![0].selected).toBe(false);
      expect(afterSelect.takes![1].selected).toBe(true);
    });
  });

  describe('toggleTakeLanes', () => {
    it('toggles showTakeLanes on a track between true and false', () => {
      const { trackId } = seedProjectWithClip();

      // Default: undefined (falsy)
      expect(useProjectStore.getState().project!.tracks[0].showTakeLanes).toBeFalsy();

      // Toggle on
      useProjectStore.getState().toggleTakeLanes(trackId);
      expect(useProjectStore.getState().project!.tracks[0].showTakeLanes).toBe(true);

      // Toggle off
      useProjectStore.getState().toggleTakeLanes(trackId);
      expect(useProjectStore.getState().project!.tracks[0].showTakeLanes).toBe(false);
    });
  });
});
