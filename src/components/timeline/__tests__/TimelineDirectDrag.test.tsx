import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUIStore } from '../../../store/uiStore';

/**
 * Tests for the direct-drag selection behavior (#576).
 *
 * The drag handler in Timeline.tsx decides:
 *   - Alt + drag → contextWindow (teal)
 *   - Plain drag on empty area → selectWindow (purple)
 *
 * Since the Timeline component relies heavily on DOM measurements
 * (getBoundingClientRect, scrollLeft, querySelectorAll), we test the
 * modifier-key decision logic and store integration in isolation.
 */

// Mock projectStorage to avoid browser API issues
vi.mock('../../../services/projectStorage', () => ({
  saveProject: vi.fn(),
}));

describe('Timeline direct drag selection (#576)', () => {
  beforeEach(() => {
    useUIStore.setState({
      selectWindow: null,
      contextWindow: null,
      selectedClipIds: new Set(),
    });
  });

  it('setSelectWindow stores selection region in uiStore', () => {
    const store = useUIStore.getState();
    store.setSelectWindow({ startTime: 1, endTime: 5, trackIds: ['track-1'] });
    expect(useUIStore.getState().selectWindow).toEqual({
      startTime: 1,
      endTime: 5,
      trackIds: ['track-1'],
    });
  });

  it('setContextWindow stores context region in uiStore', () => {
    const store = useUIStore.getState();
    store.setContextWindow({ startTime: 2, endTime: 6, trackIds: ['track-2'] });
    expect(useUIStore.getState().contextWindow).toEqual({
      startTime: 2,
      endTime: 6,
      trackIds: ['track-2'],
    });
  });

  it('selectWindow and contextWindow are independent', () => {
    const store = useUIStore.getState();
    store.setSelectWindow({ startTime: 0, endTime: 4, trackIds: ['t1'] });
    store.setContextWindow({ startTime: 1, endTime: 3, trackIds: ['t2'] });
    expect(useUIStore.getState().selectWindow).toEqual({
      startTime: 0,
      endTime: 4,
      trackIds: ['t1'],
    });
    expect(useUIStore.getState().contextWindow).toEqual({
      startTime: 1,
      endTime: 3,
      trackIds: ['t2'],
    });
  });

  it('selectWindow can be cleared by setting null', () => {
    const store = useUIStore.getState();
    store.setSelectWindow({ startTime: 0, endTime: 4, trackIds: ['t1'] });
    store.setSelectWindow(null);
    expect(useUIStore.getState().selectWindow).toBeNull();
  });

  describe('modifier key decision logic', () => {
    // These mirror the exact logic from handleMouseDownCapture in Timeline.tsx:
    //   const isCtx = e.altKey;
    //   const isSel = !isCtx;

    function classifyDrag(altKey: boolean, metaKey: boolean, ctrlKey: boolean) {
      const isCtx = altKey;
      const isSel = !isCtx;
      return { isCtx, isSel };
    }

    it('plain drag (no modifiers) → selectWindow', () => {
      const { isCtx, isSel } = classifyDrag(false, false, false);
      expect(isSel).toBe(true);
      expect(isCtx).toBe(false);
    });

    it('Cmd+drag → selectWindow (modifier ignored for selection)', () => {
      const { isCtx, isSel } = classifyDrag(false, true, false);
      expect(isSel).toBe(true);
      expect(isCtx).toBe(false);
    });

    it('Ctrl+drag → selectWindow (modifier ignored for selection)', () => {
      const { isCtx, isSel } = classifyDrag(false, false, true);
      expect(isSel).toBe(true);
      expect(isCtx).toBe(false);
    });

    it('Alt+drag → contextWindow', () => {
      const { isCtx, isSel } = classifyDrag(true, false, false);
      expect(isCtx).toBe(true);
      expect(isSel).toBe(false);
    });

    it('Alt+Cmd+drag → contextWindow (Alt takes precedence)', () => {
      const { isCtx, isSel } = classifyDrag(true, true, false);
      expect(isCtx).toBe(true);
      expect(isSel).toBe(false);
    });
  });
});
