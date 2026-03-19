import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from '../../src/store/sessionStore';
import { useProjectStore } from '../../src/store/projectStore';

function resetStores() {
  useSessionStore.setState(useSessionStore.getInitialState());
  useProjectStore.setState(useProjectStore.getInitialState());
}

describe('sessionStore', () => {
  beforeEach(() => {
    resetStores();
    // Create a project with 2 tracks
    useProjectStore.getState().createProject({ name: 'Test', bpm: 120 });
    useProjectStore.getState().addTrack('drums', 'stems');
    useProjectStore.getState().addTrack('bass', 'pianoRoll');
  });

  describe('initialization', () => {
    it('initializes session grid for all tracks', () => {
      const project = useProjectStore.getState().project!;
      useSessionStore.getState().initSession(project.tracks.map((t) => t.id));
      const state = useSessionStore.getState();
      expect(state.scenes).toHaveLength(8); // default 8 scenes
      // Each track should have 8 slots
      const trackIds = project.tracks.map((t) => t.id);
      for (const trackId of trackIds) {
        const trackSlots = state.slots.filter((s) => s.trackId === trackId);
        expect(trackSlots).toHaveLength(8);
      }
    });

    it('initializes with custom scene count', () => {
      const project = useProjectStore.getState().project!;
      useSessionStore.getState().initSession(
        project.tracks.map((t) => t.id),
        4,
      );
      expect(useSessionStore.getState().scenes).toHaveLength(4);
    });
  });

  describe('clip slot management', () => {
    beforeEach(() => {
      const project = useProjectStore.getState().project!;
      useSessionStore.getState().initSession(project.tracks.map((t) => t.id));
    });

    it('assigns a clip to a slot', () => {
      const state = useSessionStore.getState();
      const slot = state.slots[0];
      useSessionStore.getState().assignClipToSlot(slot.id, 'clip-123');
      const updated = useSessionStore.getState().slots.find((s) => s.id === slot.id)!;
      expect(updated.clipId).toBe('clip-123');
    });

    it('clears a clip from a slot', () => {
      const state = useSessionStore.getState();
      const slot = state.slots[0];
      useSessionStore.getState().assignClipToSlot(slot.id, 'clip-123');
      useSessionStore.getState().clearSlot(slot.id);
      const updated = useSessionStore.getState().slots.find((s) => s.id === slot.id)!;
      expect(updated.clipId).toBeNull();
      expect(updated.state).toBe('stopped');
    });
  });

  describe('clip launching', () => {
    beforeEach(() => {
      const project = useProjectStore.getState().project!;
      useSessionStore.getState().initSession(project.tracks.map((t) => t.id));
      // Assign a clip to first slot
      const slot = useSessionStore.getState().slots[0];
      useSessionStore.getState().assignClipToSlot(slot.id, 'clip-1');
    });

    it('launches a clip slot (sets state to playing)', () => {
      const slot = useSessionStore.getState().slots[0];
      useSessionStore.getState().launchSlot(slot.id);
      const updated = useSessionStore.getState().slots.find((s) => s.id === slot.id)!;
      expect(updated.state).toBe('playing');
    });

    it('stops all other slots on the same track when launching', () => {
      const state = useSessionStore.getState();
      const trackId = state.slots[0].trackId;
      // Assign and launch slot at index 0
      useSessionStore.getState().launchSlot(state.slots[0].id);

      // Assign and launch a different slot on the same track
      const otherSlot = state.slots.find(
        (s) => s.trackId === trackId && s.id !== state.slots[0].id,
      )!;
      useSessionStore.getState().assignClipToSlot(otherSlot.id, 'clip-2');
      useSessionStore.getState().launchSlot(otherSlot.id);

      const slots = useSessionStore.getState().slots.filter((s) => s.trackId === trackId);
      const playing = slots.filter((s) => s.state === 'playing');
      expect(playing).toHaveLength(1);
      expect(playing[0].id).toBe(otherSlot.id);
    });

    it('stops a playing slot', () => {
      const slot = useSessionStore.getState().slots[0];
      useSessionStore.getState().launchSlot(slot.id);
      useSessionStore.getState().stopSlot(slot.id);
      const updated = useSessionStore.getState().slots.find((s) => s.id === slot.id)!;
      expect(updated.state).toBe('stopped');
    });

    it('does not launch an empty slot', () => {
      // Find an empty slot
      const emptySlot = useSessionStore.getState().slots.find((s) => s.clipId === null)!;
      useSessionStore.getState().launchSlot(emptySlot.id);
      const updated = useSessionStore.getState().slots.find((s) => s.id === emptySlot.id)!;
      expect(updated.state).toBe('stopped');
    });
  });

  describe('scene launching', () => {
    beforeEach(() => {
      const project = useProjectStore.getState().project!;
      useSessionStore.getState().initSession(project.tracks.map((t) => t.id));
      // Assign clips to all slots in scene 0
      const scene0Slots = useSessionStore.getState().slots.filter((s) => s.sceneIndex === 0);
      scene0Slots.forEach((slot, i) => {
        useSessionStore.getState().assignClipToSlot(slot.id, `clip-scene0-${i}`);
      });
    });

    it('launches all slots in a scene', () => {
      useSessionStore.getState().launchScene(0);
      const scene0Slots = useSessionStore.getState().slots.filter((s) => s.sceneIndex === 0);
      for (const slot of scene0Slots) {
        expect(slot.state).toBe('playing');
      }
    });

    it('stops all other scenes when launching a scene', () => {
      // Also assign clips to scene 1
      const scene1Slots = useSessionStore.getState().slots.filter((s) => s.sceneIndex === 1);
      scene1Slots.forEach((slot, i) => {
        useSessionStore.getState().assignClipToSlot(slot.id, `clip-scene1-${i}`);
      });

      useSessionStore.getState().launchScene(0);
      useSessionStore.getState().launchScene(1);

      const scene0Slots = useSessionStore.getState().slots.filter((s) => s.sceneIndex === 0);
      for (const slot of scene0Slots) {
        expect(slot.state).toBe('stopped');
      }
      const scene1Playing = useSessionStore.getState().slots.filter(
        (s) => s.sceneIndex === 1 && s.state === 'playing',
      );
      expect(scene1Playing).toHaveLength(scene1Slots.length);
    });

    it('stops all clips in a scene', () => {
      useSessionStore.getState().launchScene(0);
      useSessionStore.getState().stopScene(0);
      const scene0Slots = useSessionStore.getState().slots.filter((s) => s.sceneIndex === 0);
      for (const slot of scene0Slots) {
        expect(slot.state).toBe('stopped');
      }
    });
  });

  describe('stopAll', () => {
    it('stops all playing slots', () => {
      const project = useProjectStore.getState().project!;
      useSessionStore.getState().initSession(project.tracks.map((t) => t.id));
      const slots = useSessionStore.getState().slots;
      useSessionStore.getState().assignClipToSlot(slots[0].id, 'clip-1');
      useSessionStore.getState().assignClipToSlot(slots[1].id, 'clip-2');
      useSessionStore.getState().launchSlot(slots[0].id);
      useSessionStore.getState().launchSlot(slots[1].id);
      useSessionStore.getState().stopAll();
      const allStopped = useSessionStore.getState().slots.every((s) => s.state === 'stopped');
      expect(allStopped).toBe(true);
    });
  });

  describe('scene management', () => {
    beforeEach(() => {
      const project = useProjectStore.getState().project!;
      useSessionStore.getState().initSession(project.tracks.map((t) => t.id));
    });

    it('renames a scene', () => {
      const scene = useSessionStore.getState().scenes[0];
      useSessionStore.getState().renameScene(scene.id, 'Intro');
      const updated = useSessionStore.getState().scenes.find((s) => s.id === scene.id)!;
      expect(updated.name).toBe('Intro');
    });

    it('adds a new scene row', () => {
      const project = useProjectStore.getState().project!;
      const initialCount = useSessionStore.getState().scenes.length;
      useSessionStore.getState().addScene(project.tracks.map((t) => t.id));
      expect(useSessionStore.getState().scenes).toHaveLength(initialCount + 1);
      // Should also add new slots for each track
      const newSceneIndex = initialCount;
      const newSlots = useSessionStore.getState().slots.filter((s) => s.sceneIndex === newSceneIndex);
      expect(newSlots).toHaveLength(project.tracks.length);
    });
  });

  describe('record to arrangement', () => {
    it('toggles recording state', () => {
      useSessionStore.getState().setRecordingToArrangement(true);
      expect(useSessionStore.getState().recordingToArrangement).toBe(true);
      useSessionStore.getState().setRecordingToArrangement(false);
      expect(useSessionStore.getState().recordingToArrangement).toBe(false);
    });

    it('records a session event', () => {
      useSessionStore.getState().setRecordingToArrangement(true);
      useSessionStore.getState().recordSessionEvent({
        slotId: 'slot-1',
        clipId: 'clip-1',
        trackId: 'track-1',
        action: 'launch',
        timestamp: 1.5,
      });
      const events = useSessionStore.getState().recordedEvents;
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('launch');
    });

    it('clears recorded events', () => {
      useSessionStore.getState().recordSessionEvent({
        slotId: 'slot-1',
        clipId: 'clip-1',
        trackId: 'track-1',
        action: 'launch',
        timestamp: 1.5,
      });
      useSessionStore.getState().clearRecordedEvents();
      expect(useSessionStore.getState().recordedEvents).toHaveLength(0);
    });
  });

  describe('MIDI capture', () => {
    it('records and captures MIDI events', () => {
      useSessionStore.getState().midiNoteOn(60, 0.8, 1.0);
      useSessionStore.getState().midiNoteOff(60, 1.5);
      const captured = useSessionStore.getState().captureMidi();
      expect(captured).toHaveLength(1);
      expect(captured[0].pitch).toBe(60);
      expect(captured[0].duration).toBe(0.5);
    });

    it('clears MIDI buffer', () => {
      useSessionStore.getState().midiNoteOn(60, 0.8, 1.0);
      useSessionStore.getState().midiNoteOff(60, 1.5);
      useSessionStore.getState().clearMidiBuffer();
      expect(useSessionStore.getState().captureMidi()).toHaveLength(0);
    });
  });
});
