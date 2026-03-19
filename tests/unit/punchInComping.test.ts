import { describe, it, expect, beforeEach } from 'vitest';
import { useTransportStore } from '../../src/store/transportStore';
import { useProjectStore } from '../../src/store/projectStore';

describe('Punch-in Recording & Comping Workflow', () => {
  describe('Transport: punch-in/out range', () => {
    beforeEach(() => {
      useTransportStore.setState({
        punchInTime: null,
        punchOutTime: null,
        punchEnabled: false,
        loopEnabled: false,
        loopRecordingEnabled: false,
        isRecording: false,
        armedTrackIds: [],
      });
    });

    it('setPunchIn/setPunchOut set the punch range', () => {
      const store = useTransportStore.getState();
      store.setPunchIn(4);
      store.setPunchOut(12);
      const state = useTransportStore.getState();
      expect(state.punchInTime).toBe(4);
      expect(state.punchOutTime).toBe(12);
    });

    it('togglePunch toggles punchEnabled', () => {
      expect(useTransportStore.getState().punchEnabled).toBe(false);
      useTransportStore.getState().togglePunch();
      expect(useTransportStore.getState().punchEnabled).toBe(true);
      useTransportStore.getState().togglePunch();
      expect(useTransportStore.getState().punchEnabled).toBe(false);
    });

    it('setPunchRange sets both in and out in one call', () => {
      useTransportStore.getState().setPunchRange(2, 8);
      const state = useTransportStore.getState();
      expect(state.punchInTime).toBe(2);
      expect(state.punchOutTime).toBe(8);
      expect(state.punchEnabled).toBe(true);
    });
  });

  describe('Project store: take management', () => {
    beforeEach(() => {
      const store = useProjectStore.getState();
      store.createProject({ name: 'Punch-in Test' });
      store.addTrack('vocals', 'stems');
    });

    it('promoteTake replaces clip audio with selected take audio', () => {
      const store = useProjectStore.getState();
      const track = store.project!.tracks[0];
      const clip = store.addClip(track.id, {
        startTime: 0,
        duration: 4,
        prompt: 'vocal',
        lyrics: '',
        source: 'uploaded',
      });

      // Set initial clip audio
      useProjectStore.getState().updateClipStatus(clip.id, 'ready', {
        isolatedAudioKey: 'original-audio',
        waveformPeaks: [0.5],
        audioDuration: 4,
        audioOffset: 0,
      });

      store.addTake(clip.id, 'take-1-audio');
      store.addTake(clip.id, 'take-2-audio');
      const takes = useProjectStore.getState().getClipById(clip.id)!.takes!;

      useProjectStore.getState().promoteTake(clip.id, takes[1].id);

      const updated = useProjectStore.getState().getClipById(clip.id)!;
      expect(updated.isolatedAudioKey).toBe('take-2-audio');
      // Takes should be cleared after promote
      expect(updated.takes).toHaveLength(0);
    });

    it('deleteTake removes a specific take', () => {
      const store = useProjectStore.getState();
      const track = store.project!.tracks[0];
      const clip = store.addClip(track.id, {
        startTime: 0,
        duration: 4,
        prompt: 'vocal',
        lyrics: '',
      });

      store.addTake(clip.id, 'take-a');
      store.addTake(clip.id, 'take-b');
      store.addTake(clip.id, 'take-c');
      const takes = useProjectStore.getState().getClipById(clip.id)!.takes!;
      expect(takes).toHaveLength(3);

      useProjectStore.getState().deleteTake(clip.id, takes[1].id);
      const afterDelete = useProjectStore.getState().getClipById(clip.id)!.takes!;
      expect(afterDelete).toHaveLength(2);
      expect(afterDelete[0].audioKey).toBe('take-a');
      expect(afterDelete[1].audioKey).toBe('take-c');
    });

    it('deleteTake does nothing for non-existent take', () => {
      const store = useProjectStore.getState();
      const track = store.project!.tracks[0];
      const clip = store.addClip(track.id, {
        startTime: 0,
        duration: 4,
        prompt: 'vocal',
        lyrics: '',
      });

      store.addTake(clip.id, 'take-a');
      useProjectStore.getState().deleteTake(clip.id, 'nonexistent');
      const after = useProjectStore.getState().getClipById(clip.id)!.takes!;
      expect(after).toHaveLength(1);
    });

    it('flattenComp promotes selected take and clears takes', () => {
      const store = useProjectStore.getState();
      const track = store.project!.tracks[0];
      const clip = store.addClip(track.id, {
        startTime: 0,
        duration: 4,
        prompt: 'vocal',
        lyrics: '',
        source: 'uploaded',
      });

      useProjectStore.getState().updateClipStatus(clip.id, 'ready', {
        isolatedAudioKey: 'original-audio',
        waveformPeaks: [0.5],
        audioDuration: 4,
        audioOffset: 0,
      });

      store.addTake(clip.id, 'take-1');
      store.addTake(clip.id, 'take-2');
      store.addTake(clip.id, 'take-3');

      // Select take 2
      const takes = useProjectStore.getState().getClipById(clip.id)!.takes!;
      useProjectStore.getState().selectTake(clip.id, takes[1].id);

      // Flatten should promote the selected take
      useProjectStore.getState().flattenComp(clip.id);

      const updated = useProjectStore.getState().getClipById(clip.id)!;
      expect(updated.isolatedAudioKey).toBe('take-2');
      expect(updated.takes).toHaveLength(0);
    });

    it('flattenComp with no selected take keeps original audio', () => {
      const store = useProjectStore.getState();
      const track = store.project!.tracks[0];
      const clip = store.addClip(track.id, {
        startTime: 0,
        duration: 4,
        prompt: 'vocal',
        lyrics: '',
        source: 'uploaded',
      });

      useProjectStore.getState().updateClipStatus(clip.id, 'ready', {
        isolatedAudioKey: 'original-audio',
        waveformPeaks: [0.5],
        audioDuration: 4,
        audioOffset: 0,
      });

      store.addTake(clip.id, 'take-1');
      store.addTake(clip.id, 'take-2');

      // Don't select any take
      useProjectStore.getState().flattenComp(clip.id);

      const updated = useProjectStore.getState().getClipById(clip.id)!;
      // Original audio should remain since no take was selected
      expect(updated.isolatedAudioKey).toBe('original-audio');
      expect(updated.takes).toHaveLength(0);
    });

    it('addTake with waveformPeaks stores peaks on the take', () => {
      const store = useProjectStore.getState();
      const track = store.project!.tracks[0];
      const clip = store.addClip(track.id, {
        startTime: 0,
        duration: 4,
        prompt: 'vocal',
        lyrics: '',
      });

      store.addTake(clip.id, 'take-audio', [0.1, 0.5, 0.3]);
      const updated = useProjectStore.getState().getClipById(clip.id)!;
      expect(updated.takes![0].waveformPeaks).toEqual([0.1, 0.5, 0.3]);
    });

    it('addTake without waveformPeaks stores null', () => {
      const store = useProjectStore.getState();
      const track = store.project!.tracks[0];
      const clip = store.addClip(track.id, {
        startTime: 0,
        duration: 4,
        prompt: 'vocal',
        lyrics: '',
      });

      store.addTake(clip.id, 'take-audio');
      const updated = useProjectStore.getState().getClipById(clip.id)!;
      expect(updated.takes![0].waveformPeaks).toBeNull();
    });
  });

  describe('Undo support for take actions', () => {
    beforeEach(() => {
      const store = useProjectStore.getState();
      store.createProject({ name: 'Undo Test' });
      store.addTrack('vocals', 'stems');
    });

    it('undo after deleteTake restores the take', () => {
      const store = useProjectStore.getState();
      const track = store.project!.tracks[0];
      const clip = store.addClip(track.id, {
        startTime: 0,
        duration: 4,
        prompt: 'vocal',
        lyrics: '',
      });

      store.addTake(clip.id, 'take-a');
      store.addTake(clip.id, 'take-b');

      const takes = useProjectStore.getState().getClipById(clip.id)!.takes!;
      useProjectStore.getState().deleteTake(clip.id, takes[0].id);

      expect(useProjectStore.getState().getClipById(clip.id)!.takes).toHaveLength(1);

      useProjectStore.getState().undo();
      expect(useProjectStore.getState().getClipById(clip.id)!.takes).toHaveLength(2);
    });

    it('undo after promoteTake restores takes and original audio', () => {
      const store = useProjectStore.getState();
      const track = store.project!.tracks[0];
      const clip = store.addClip(track.id, {
        startTime: 0,
        duration: 4,
        prompt: 'vocal',
        lyrics: '',
        source: 'uploaded',
      });

      useProjectStore.getState().updateClipStatus(clip.id, 'ready', {
        isolatedAudioKey: 'original-audio',
        waveformPeaks: [0.5],
        audioDuration: 4,
        audioOffset: 0,
      });

      store.addTake(clip.id, 'take-1-audio');
      const takes = useProjectStore.getState().getClipById(clip.id)!.takes!;

      useProjectStore.getState().promoteTake(clip.id, takes[0].id);
      expect(useProjectStore.getState().getClipById(clip.id)!.isolatedAudioKey).toBe('take-1-audio');

      useProjectStore.getState().undo();
      const restored = useProjectStore.getState().getClipById(clip.id)!;
      expect(restored.isolatedAudioKey).toBe('original-audio');
      expect(restored.takes).toHaveLength(1);
    });
  });
});
