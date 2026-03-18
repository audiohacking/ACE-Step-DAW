import { beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from '../../src/store/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState(useUIStore.getInitialState(), true);
  });

  describe('pixelsPerSecond zoom', () => {
    it('sets an explicit zoom level', () => {
      useUIStore.getState().setPixelsPerSecond(200);

      expect(useUIStore.getState().pixelsPerSecond).toBe(200);
    });

    it('zooms in through discrete levels and stops at the maximum', () => {
      useUIStore.getState().setPixelsPerSecond(50);

      useUIStore.getState().zoomIn();
      expect(useUIStore.getState().pixelsPerSecond).toBe(100);

      useUIStore.getState().zoomIn();
      expect(useUIStore.getState().pixelsPerSecond).toBe(200);

      useUIStore.getState().zoomIn();
      expect(useUIStore.getState().pixelsPerSecond).toBe(500);

      useUIStore.getState().zoomIn();
      expect(useUIStore.getState().pixelsPerSecond).toBe(500);
    });

    it('zooms out through discrete levels and stops at the minimum', () => {
      useUIStore.getState().setPixelsPerSecond(200);

      useUIStore.getState().zoomOut();
      expect(useUIStore.getState().pixelsPerSecond).toBe(100);

      useUIStore.getState().zoomOut();
      expect(useUIStore.getState().pixelsPerSecond).toBe(50);

      useUIStore.getState().setPixelsPerSecond(10);
      useUIStore.getState().zoomOut();
      expect(useUIStore.getState().pixelsPerSecond).toBe(10);
    });
  });

  describe('panel toggles', () => {
    it('updates mixer, loop browser, and library panel visibility', () => {
      useUIStore.getState().setShowMixer(true);
      useUIStore.getState().toggleLoopBrowser();
      useUIStore.getState().setShowLibrary(true);

      let state = useUIStore.getState();
      expect(state.showMixer).toBe(true);
      expect(state.loopBrowserOpen).toBe(true);
      expect(state.showLibrary).toBe(true);

      useUIStore.getState().setShowMixer(false);
      useUIStore.getState().toggleLoopBrowser();
      useUIStore.getState().setShowLibrary(false);

      state = useUIStore.getState();
      expect(state.showMixer).toBe(false);
      expect(state.loopBrowserOpen).toBe(false);
      expect(state.showLibrary).toBe(false);
    });
  });

  describe('selectedClipIds', () => {
    it('adds, removes, and clears selected clip ids', () => {
      useUIStore.getState().selectClip('clip-a');
      expect(Array.from(useUIStore.getState().selectedClipIds)).toEqual(['clip-a']);

      useUIStore.getState().selectClip('clip-b', true);
      expect(Array.from(useUIStore.getState().selectedClipIds).sort()).toEqual(['clip-a', 'clip-b']);

      useUIStore.getState().selectClip('clip-a', true);
      expect(Array.from(useUIStore.getState().selectedClipIds)).toEqual(['clip-b']);

      useUIStore.getState().deselectAll();
      expect(useUIStore.getState().selectedClipIds.size).toBe(0);
    });
  });

  describe('panel height constraints', () => {
    it('clamps mixer height between 160 and 500', () => {
      useUIStore.getState().setMixerHeight(120);
      expect(useUIStore.getState().mixerHeight).toBe(160);

      useUIStore.getState().setMixerHeight(640);
      expect(useUIStore.getState().mixerHeight).toBe(500);
    });

    it('clamps piano roll height between 220 and 700', () => {
      useUIStore.getState().setPianoRollHeight(180);
      expect(useUIStore.getState().pianoRollHeight).toBe(220);

      useUIStore.getState().setPianoRollHeight(760);
      expect(useUIStore.getState().pianoRollHeight).toBe(700);
    });
  });
});
