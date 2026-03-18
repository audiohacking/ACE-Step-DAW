import { beforeEach, describe, expect, it } from 'vitest';
import { useTransportStore } from '../../src/store/transportStore';

describe('transportStore', () => {
  beforeEach(() => {
    useTransportStore.setState(useTransportStore.getInitialState(), true);
  });

  describe('play/pause/stop state transitions', () => {
    it('plays, pauses, and stops transport state correctly', () => {
      useTransportStore.getState().play();
      expect(useTransportStore.getState().isPlaying).toBe(true);

      useTransportStore.getState().pause();
      expect(useTransportStore.getState().isPlaying).toBe(false);

      useTransportStore.getState().seek(12.5);
      useTransportStore.getState().play();
      useTransportStore.getState().stop();

      const state = useTransportStore.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.currentTime).toBe(0);
    });
  });

  describe('seek bounds', () => {
    it('does not allow negative current time', () => {
      useTransportStore.getState().seek(-3);

      expect(useTransportStore.getState().currentTime).toBe(0);
    });
  });

  describe('track arming', () => {
    it('supports exclusive arming by default', () => {
      useTransportStore.getState().armTrack('track-a');
      useTransportStore.getState().toggleArmTrack('track-b');

      expect(useTransportStore.getState().armedTrackIds).toEqual(['track-b']);
    });

    it('supports additive arming and disarming via toggleArmTrack', () => {
      useTransportStore.getState().toggleArmTrack('track-a', false);
      useTransportStore.getState().toggleArmTrack('track-b', false);
      expect(useTransportStore.getState().armedTrackIds).toEqual(['track-a', 'track-b']);

      useTransportStore.getState().toggleArmTrack('track-a', false);
      expect(useTransportStore.getState().armedTrackIds).toEqual(['track-b']);
    });

    it('arms and disarms tracks directly', () => {
      useTransportStore.getState().armTrack('track-a');
      useTransportStore.getState().armTrack('track-a');
      expect(useTransportStore.getState().armedTrackIds).toEqual(['track-a']);

      useTransportStore.getState().disarmTrack('track-a');
      expect(useTransportStore.getState().armedTrackIds).toEqual([]);
    });
  });

  describe('recording and loop state', () => {
    it('updates recording state', () => {
      useTransportStore.getState().setIsRecording(true);
      expect(useTransportStore.getState().isRecording).toBe(true);

      useTransportStore.getState().setIsRecording(false);
      expect(useTransportStore.getState().isRecording).toBe(false);
    });

    it('toggles loop state', () => {
      useTransportStore.getState().toggleLoop();
      expect(useTransportStore.getState().loopEnabled).toBe(true);

      useTransportStore.getState().toggleLoop();
      expect(useTransportStore.getState().loopEnabled).toBe(false);
    });
  });
});
