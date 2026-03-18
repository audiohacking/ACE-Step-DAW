# Drag & Drop Testing Best Practices for ACE-Step DAW

> Research date: 2026-03-18
> Stack: React + TypeScript + Vite + Zustand + Tone.js + Playwright + Vitest

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Testing Architecture Overview](#testing-architecture-overview)
3. [Layer 1: Store-Level Unit Tests (Vitest)](#layer-1-store-level-unit-tests)
4. [Layer 2: Playwright Drag E2E Tests](#layer-2-playwright-drag-e2e-tests)
5. [Layer 3: Visual Regression Testing](#layer-3-visual-regression-testing)
6. [Canvas-Based Interaction Testing](#canvas-based-interaction-testing)
7. [Agent-Friendly Testing Patterns](#agent-friendly-testing-patterns)
8. [Drag Test Harness for AI Agents](#drag-test-harness-for-ai-agents)
9. [Tool Recommendations](#tool-recommendations)
10. [Priority List: What to Test First](#priority-list)
11. [Sample Test Code](#sample-test-code)
12. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

The core insight: **most drag bugs are state bugs, not visual bugs**. A clip that jumps to the wrong position, a note that gets the wrong pitch — these are all testable via state assertions without human eyes. The recommended architecture uses three layers:

1. **Store-level tests** (Vitest) — Test the pure state transitions: `moveClipToTrack`, `updateClip`, `batchMoveClips`, `addMidiNote`, `updateMidiNote`. These are fast, deterministic, and cover 70% of drag logic bugs.
2. **E2E drag tests** (Playwright) — Use `page.mouse` API to simulate real drags, then assert state via `window.__store`. These catch integration bugs between DOM events and state updates.
3. **Visual regression** (Playwright `toHaveScreenshot()`) — Catch rendering/layout regressions after drag operations. Run in CI with consistent environments.

This approach lets Claude Code / Codex verify drag logic works **without human eyes** — the state assertions are the source of truth.

---

## Testing Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Test Pyramid                      │
│                                                      │
│           ┌───────────────────┐                      │
│           │  Visual Regression │  ~5 tests           │
│           │  (screenshots)     │  Catch layout bugs  │
│           └───────────────────┘                      │
│        ┌──────────────────────────┐                  │
│        │   E2E Drag Tests          │  ~15 tests      │
│        │   (Playwright + mouse)    │  Integration     │
│        └──────────────────────────┘                  │
│     ┌─────────────────────────────────┐              │
│     │   Store-Level Unit Tests         │  ~30 tests  │
│     │   (Vitest + Zustand direct)      │  Logic       │
│     └─────────────────────────────────┘              │
└─────────────────────────────────────────────────────┘
```

---

## Layer 1: Store-Level Unit Tests

### Why This Is the Most Important Layer

Our `ClipBlock.tsx` does three things during a drag:
1. Calculates new coordinates from mouse delta
2. Calls `updateClip()`, `moveClipToTrack()`, `batchMoveClips()`, etc.
3. Renders ghost/preview UI

Steps 1 and 2 are **pure logic** testable without any DOM. Step 3 only matters visually.

### What to Test

```typescript
// tests/unit/drag-logic.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore } from '../../src/store/projectStore';
import { snapToGrid } from '../../src/utils/time';

vi.mock('../../src/services/projectStorage', () => ({
  saveProject: vi.fn(),
}));

describe('Clip Drag State Transitions', () => {
  let trackId: string;
  let clipId: string;

  beforeEach(() => {
    useProjectStore.setState({ project: null });
    useProjectStore.getState().createProject({ bpm: 120 });
    const track = useProjectStore.getState().addTrack('drums');
    trackId = track.id;
    const clip = useProjectStore.getState().addClip(trackId, {
      startTime: 0,
      duration: 30,
      prompt: 'test clip',
      lyrics: '',
    });
    clipId = clip.id;
  });

  it('updateClip moves clip to new startTime', () => {
    useProjectStore.getState().updateClip(clipId, { startTime: 10 });
    const clip = useProjectStore.getState().getClipById(clipId);
    expect(clip?.startTime).toBe(10);
  });

  it('moveClipToTrack transfers clip between tracks', () => {
    const track2 = useProjectStore.getState().addTrack('bass');
    useProjectStore.getState().moveClipToTrack(clipId, track2.id);
    
    const drumsTrack = useProjectStore.getState().getTrackById(trackId);
    const bassTrack = useProjectStore.getState().getTrackById(track2.id);
    expect(drumsTrack?.clips.length).toBe(0);
    expect(bassTrack?.clips.length).toBe(1);
    expect(bassTrack?.clips[0].id).toBe(clipId);
  });

  it('moveClipToTrack preserves clip properties', () => {
    const origClip = useProjectStore.getState().getClipById(clipId)!;
    const track2 = useProjectStore.getState().addTrack('bass');
    useProjectStore.getState().moveClipToTrack(clipId, track2.id, 5);
    
    const movedClip = useProjectStore.getState().getClipById(clipId);
    expect(movedClip?.prompt).toBe(origClip.prompt);
    expect(movedClip?.duration).toBe(origClip.duration);
    expect(movedClip?.startTime).toBe(5);
  });

  it('batchMoveClips shifts multiple clips by offset', () => {
    const clip2 = useProjectStore.getState().addClip(trackId, {
      startTime: 30,
      duration: 15,
      prompt: 'clip 2',
      lyrics: '',
    });
    
    useProjectStore.getState().batchMoveClips([clipId, clip2.id], 5);
    
    const c1 = useProjectStore.getState().getClipById(clipId);
    const c2 = useProjectStore.getState().getClipById(clip2.id);
    expect(c1?.startTime).toBe(5);
    expect(c2?.startTime).toBe(35);
  });

  it('duplicateClipToTrack creates copy at target', () => {
    const track2 = useProjectStore.getState().addTrack('bass');
    useProjectStore.getState().duplicateClipToTrack(clipId, track2.id, 10);
    
    const drumsTrack = useProjectStore.getState().getTrackById(trackId);
    const bassTrack = useProjectStore.getState().getTrackById(track2.id);
    expect(drumsTrack?.clips.length).toBe(1); // Original stays
    expect(bassTrack?.clips.length).toBe(1); // Copy created
    expect(bassTrack?.clips[0].startTime).toBe(10);
  });

  it('clip resize left adjusts startTime and duration', () => {
    useProjectStore.getState().updateClip(clipId, {
      startTime: 5,
      duration: 25,
      audioOffset: 0,
    });
    
    // Simulate resize-left: new start at 2, duration increases by 3
    useProjectStore.getState().updateClip(clipId, {
      startTime: 2,
      duration: 28,
      audioOffset: 0,
    });
    
    const clip = useProjectStore.getState().getClipById(clipId);
    expect(clip?.startTime).toBe(2);
    expect(clip?.duration).toBe(28);
  });

  it('clip resize right changes only duration', () => {
    useProjectStore.getState().updateClip(clipId, { duration: 45 });
    const clip = useProjectStore.getState().getClipById(clipId);
    expect(clip?.startTime).toBe(0); // Unchanged
    expect(clip?.duration).toBe(45);
  });
});

describe('snapToGrid', () => {
  it('snaps to nearest beat at 120 BPM', () => {
    // At 120 BPM, 1 beat = 0.5s
    const snapped = snapToGrid(1.3, 120, 1);
    expect(snapped).toBe(1.5); // or 1.0, depending on implementation
  });

  it('returns 0 for negative values', () => {
    const snapped = snapToGrid(-1, 120, 1);
    expect(snapped).toBeGreaterThanOrEqual(0);
  });
});

describe('MIDI Note Drag State Transitions', () => {
  let trackId: string;
  let clipId: string;

  beforeEach(() => {
    useProjectStore.setState({ project: null });
    useProjectStore.getState().createProject({ bpm: 120 });
    const track = useProjectStore.getState().addTrack('keyboard', 'pianoRoll');
    trackId = track.id;
    const clip = useProjectStore.getState().ensureMidiClip(trackId, 0, 8);
    clipId = clip.id;
  });

  it('addMidiNote creates note at specified position', () => {
    const noteId = useProjectStore.getState().addMidiNote(clipId, {
      pitch: 60,
      startBeat: 0,
      durationBeats: 1,
      velocity: 100,
    });
    
    const clip = useProjectStore.getState().getClipById(clipId);
    const note = clip?.midiData?.notes.find(n => n.id === noteId);
    expect(note).toBeDefined();
    expect(note?.pitch).toBe(60);
    expect(note?.startBeat).toBe(0);
  });

  it('updateMidiNote changes pitch (vertical drag)', () => {
    const noteId = useProjectStore.getState().addMidiNote(clipId, {
      pitch: 60,
      startBeat: 0,
      durationBeats: 1,
      velocity: 100,
    });
    
    useProjectStore.getState().updateMidiNote(clipId, noteId!, { pitch: 65 });
    
    const clip = useProjectStore.getState().getClipById(clipId);
    const note = clip?.midiData?.notes.find(n => n.id === noteId);
    expect(note?.pitch).toBe(65);
  });

  it('updateMidiNote changes startBeat (horizontal drag)', () => {
    const noteId = useProjectStore.getState().addMidiNote(clipId, {
      pitch: 60,
      startBeat: 0,
      durationBeats: 1,
      velocity: 100,
    });
    
    useProjectStore.getState().updateMidiNote(clipId, noteId!, { startBeat: 2 });
    
    const clip = useProjectStore.getState().getClipById(clipId);
    const note = clip?.midiData?.notes.find(n => n.id === noteId);
    expect(note?.startBeat).toBe(2);
  });

  it('updateMidiNote resizes note duration', () => {
    const noteId = useProjectStore.getState().addMidiNote(clipId, {
      pitch: 60,
      startBeat: 0,
      durationBeats: 1,
      velocity: 100,
    });
    
    useProjectStore.getState().updateMidiNote(clipId, noteId!, { durationBeats: 4 });
    
    const clip = useProjectStore.getState().getClipById(clipId);
    const note = clip?.midiData?.notes.find(n => n.id === noteId);
    expect(note?.durationBeats).toBe(4);
  });

  it('quantizeMidiNotes snaps notes to grid', () => {
    const noteId = useProjectStore.getState().addMidiNote(clipId, {
      pitch: 60,
      startBeat: 0.3,
      durationBeats: 0.8,
      velocity: 100,
    });
    
    useProjectStore.getState().quantizeMidiNotes(clipId, [noteId!], 0.5);
    
    const clip = useProjectStore.getState().getClipById(clipId);
    const note = clip?.midiData?.notes.find(n => n.id === noteId);
    expect(note?.startBeat).toBe(0.5); // Snapped to nearest 0.5
  });
});
```

### Key Insight: Extract Drag Math Into Pure Functions

The `ClipBlock.tsx` inline drag handler mixes DOM coordinates with state updates. Extract the math:

```typescript
// src/utils/dragMath.ts
export function computeClipDragResult(params: {
  origStart: number;
  origDuration: number;
  deltaPx: number;
  pixelsPerSecond: number;
  bpm: number;
  totalDuration: number;
  isFineMove: boolean;
}): { newStart: number } {
  const { origStart, origDuration, deltaPx, pixelsPerSecond, bpm, totalDuration, isFineMove } = params;
  const deltaSec = deltaPx / pixelsPerSecond;
  
  let newStart = isFineMove
    ? Math.round((origStart + deltaSec) * 100) / 100
    : snapToGrid(origStart + deltaSec, bpm, 1);
  
  newStart = Math.max(0, Math.min(newStart, totalDuration - origDuration));
  return { newStart };
}

export function computeResizeLeftResult(params: {
  origStart: number;
  origDuration: number;
  origAudioOffset: number;
  origAudioDuration: number;
  deltaPx: number;
  pixelsPerSecond: number;
  bpm: number;
}): { newStart: number; newDuration: number; newAudioOffset: number } {
  const { origStart, origDuration, origAudioOffset, origAudioDuration, deltaPx, pixelsPerSecond, bpm } = params;
  const deltaSec = deltaPx / pixelsPerSecond;
  const MIN_CLIP_DURATION = 0.5;
  
  let newStart = snapToGrid(origStart + deltaSec, bpm, 1);
  newStart = Math.max(0, newStart);
  newStart = Math.min(newStart, origStart + origDuration - MIN_CLIP_DURATION);
  
  const shift = newStart - origStart;
  let newAudioOffset = origAudioOffset + shift;
  newAudioOffset = Math.max(0, newAudioOffset);
  newAudioOffset = Math.min(newAudioOffset, origAudioDuration - MIN_CLIP_DURATION);
  
  const newDuration = origDuration + (origStart - newStart);
  return { newStart, newDuration, newAudioOffset };
}

export function computeResizeRightResult(params: {
  origStart: number;
  origDuration: number;
  deltaPx: number;
  pixelsPerSecond: number;
  bpm: number;
  totalDuration: number;
}): { newDuration: number } {
  const { origStart, origDuration, deltaPx, pixelsPerSecond, bpm, totalDuration } = params;
  const deltaSec = deltaPx / pixelsPerSecond;
  const MIN_CLIP_DURATION = 0.5;
  
  let newDuration = snapToGrid(origDuration + deltaSec, bpm, 1);
  newDuration = Math.max(MIN_CLIP_DURATION, newDuration);
  newDuration = Math.min(newDuration, totalDuration - origStart);
  return { newDuration };
}
```

These pure functions are trivially testable with Vitest — no DOM, no React, no browser needed.

---

## Layer 2: Playwright Drag E2E Tests

### The `page.mouse` API — The Right Tool for DAW Testing

The `locator.dragTo()` helper is designed for HTML5 DnD protocol (`dragstart`/`dragover`/`drop` events). Our DAW uses **raw mouse events** (`mousedown`/`mousemove`/`mouseup`), so we need the lower-level `page.mouse` API.

### Critical Pattern: Two Moves for dragover

From Playwright docs: *"To reliably issue the second mouse move, repeat your mouse.move() or locator.hover() twice."* This is essential — a single `mouse.move()` may not trigger all intermediate events.

### Pattern: State Bridge via `window.__store`

Our app already exposes `window.__store = useProjectStore` in `main.tsx`. This is the key to agent-friendly testing:

```typescript
// tests/e2e/helpers/store-bridge.ts
import { Page } from '@playwright/test';

export async function getStoreState(page: Page) {
  return page.evaluate(() => {
    const store = (window as any).__store;
    return store.getState().project;
  });
}

export async function getClipById(page: Page, clipId: string) {
  return page.evaluate((id) => {
    const store = (window as any).__store;
    return store.getState().getClipById(id);
  }, clipId);
}

export async function getTrackClips(page: Page, trackId: string) {
  return page.evaluate((id) => {
    const store = (window as any).__store;
    const track = store.getState().getTrackById(id);
    return track?.clips.map((c: any) => ({
      id: c.id,
      startTime: c.startTime,
      duration: c.duration,
      prompt: c.prompt,
    }));
  }, id);
}

export async function setupTestProject(page: Page) {
  return page.evaluate(() => {
    const store = (window as any).__store;
    store.getState().createProject({ name: 'Drag Test', bpm: 120 });
    const drums = store.getState().addTrack('drums');
    const bass = store.getState().addTrack('bass');
    const clip = store.getState().addClip(drums.id, {
      startTime: 5,
      duration: 30,
      prompt: 'test drums beat',
      lyrics: '',
    });
    // Force ready status so waveform renders
    store.getState().updateClipStatus(clip.id, 'ready');
    return { drumsId: drums.id, bassId: bass.id, clipId: clip.id };
  });
}
```

### Core Drag Test Pattern

```typescript
// tests/e2e/clip-drag.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Clip Drag Operations', () => {
  let ids: { drumsId: string; bassId: string; clipId: string };

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    ids = await page.evaluate(() => {
      const store = (window as any).__store;
      store.getState().createProject({ name: 'Drag Test', bpm: 120 });
      const drums = store.getState().addTrack('drums');
      const bass = store.getState().addTrack('bass');
      const clip = store.getState().addClip(drums.id, {
        startTime: 5, duration: 30,
        prompt: 'test drums', lyrics: '',
      });
      store.getState().updateClipStatus(clip.id, 'ready');
      return { drumsId: drums.id, bassId: bass.id, clipId: clip.id };
    });
    // Wait for UI to render
    await page.waitForSelector('[data-clip-block]');
  });

  test('drag clip horizontally changes startTime', async ({ page }) => {
    const clipEl = page.locator('[data-clip-block]').first();
    const box = await clipEl.boundingBox();
    expect(box).not.toBeNull();

    const startX = box!.x + box!.width / 2;
    const startY = box!.y + box!.height / 2;
    const dragDistance = 200; // pixels

    // Record initial state
    const before = await page.evaluate((clipId) => {
      return (window as any).__store.getState().getClipById(clipId);
    }, ids.clipId);

    // Perform drag: mousedown → multiple mousemoves → mouseup
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Multiple moves to trigger dragover-like behavior
    await page.mouse.move(startX + dragDistance / 2, startY, { steps: 5 });
    await page.mouse.move(startX + dragDistance, startY, { steps: 5 });
    await page.mouse.up();

    // Assert state change
    const after = await page.evaluate((clipId) => {
      return (window as any).__store.getState().getClipById(clipId);
    }, ids.clipId);

    expect(after.startTime).toBeGreaterThan(before.startTime);
    expect(after.duration).toBe(before.duration); // Duration unchanged
  });

  test('drag clip to different track via cross-track move', async ({ page }) => {
    const clipEl = page.locator('[data-clip-block]').first();
    const box = await clipEl.boundingBox();

    // Find the bass track lane
    const bassLane = page.locator(`[data-track-id="${ids.bassId}"]`);
    const bassBox = await bassLane.boundingBox();
    expect(box).not.toBeNull();
    expect(bassBox).not.toBeNull();

    const startX = box!.x + box!.width / 2;
    const startY = box!.y + box!.height / 2;
    const targetY = bassBox!.y + bassBox!.height / 2;

    // Drag from drums track to bass track
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, (startY + targetY) / 2, { steps: 3 });
    await page.mouse.move(startX, targetY, { steps: 3 });
    await page.mouse.up();

    // Assert clip moved to bass track
    const result = await page.evaluate(({ clipId, bassId }) => {
      const store = (window as any).__store;
      const bassTrack = store.getState().getTrackById(bassId);
      return {
        bassClipCount: bassTrack?.clips.length ?? 0,
        clipInBass: bassTrack?.clips.some((c: any) => c.id === clipId) ?? false,
      };
    }, { clipId: ids.clipId, bassId: ids.bassId });

    expect(result.clipInBass).toBe(true);
  });

  test('shift-drag duplicates clip', async ({ page }) => {
    const clipEl = page.locator('[data-clip-block]').first();
    const box = await clipEl.boundingBox();
    expect(box).not.toBeNull();

    const startX = box!.x + box!.width / 2;
    const startY = box!.y + box!.height / 2;

    const beforeCount = await page.evaluate((trackId) => {
      return (window as any).__store.getState().getTrackById(trackId)?.clips.length;
    }, ids.drumsId);

    // Shift + drag
    await page.keyboard.down('Shift');
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 200, startY, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.up('Shift');

    const afterCount = await page.evaluate((trackId) => {
      return (window as any).__store.getState().getTrackById(trackId)?.clips.length;
    }, ids.drumsId);

    expect(afterCount).toBe(beforeCount + 1);
  });

  test('resize-right changes duration but not startTime', async ({ page }) => {
    const clipEl = page.locator('[data-clip-block]').first();
    const box = await clipEl.boundingBox();
    expect(box).not.toBeNull();

    // Click near right edge (within 6px handle)
    const rightEdgeX = box!.x + box!.width - 3;
    const centerY = box!.y + box!.height / 2;

    const before = await page.evaluate((clipId) => {
      return (window as any).__store.getState().getClipById(clipId);
    }, ids.clipId);

    await page.mouse.move(rightEdgeX, centerY);
    await page.mouse.down();
    await page.mouse.move(rightEdgeX + 100, centerY, { steps: 5 });
    await page.mouse.up();

    const after = await page.evaluate((clipId) => {
      return (window as any).__store.getState().getClipById(clipId);
    }, ids.clipId);

    expect(after.startTime).toBe(before.startTime);
    expect(after.duration).toBeGreaterThan(before.duration);
  });

  test('resize-left changes startTime and duration', async ({ page }) => {
    const clipEl = page.locator('[data-clip-block]').first();
    const box = await clipEl.boundingBox();
    expect(box).not.toBeNull();

    // Click near left edge (within 6px handle)
    const leftEdgeX = box!.x + 3;
    const centerY = box!.y + box!.height / 2;

    const before = await page.evaluate((clipId) => {
      return (window as any).__store.getState().getClipById(clipId);
    }, ids.clipId);

    await page.mouse.move(leftEdgeX, centerY);
    await page.mouse.down();
    await page.mouse.move(leftEdgeX - 80, centerY, { steps: 5 });
    await page.mouse.up();

    const after = await page.evaluate((clipId) => {
      return (window as any).__store.getState().getClipById(clipId);
    }, ids.clipId);

    expect(after.startTime).toBeLessThan(before.startTime);
    expect(after.duration).toBeGreaterThan(before.duration);
    // Total end time should be approximately the same
    expect(after.startTime + after.duration).toBeCloseTo(
      before.startTime + before.duration, 1
    );
  });
});
```

### Important: `steps` Parameter

`page.mouse.move(x, y, { steps: 5 })` generates **intermediate mousemove events** along the path. This is critical for our DAW because:
- The `onMouseMove` handler uses a 3px dead zone before activating drag mode
- Cross-track detection via `findClosestLane()` needs intermediate Y positions
- Without steps, the mouse "teleports" and may not trigger drag state

---

## Layer 3: Visual Regression Testing

### Playwright's `toHaveScreenshot()` — Built-in and Good Enough

No need for Percy or Chromatic at this stage. Playwright's built-in visual comparison is free, local, and integrates with our existing setup.

### Configuration

```typescript
// playwright.config.ts additions
export default defineConfig({
  // ... existing config ...
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01, // Allow 1% pixel diff (anti-aliasing)
      animations: 'disabled',  // Freeze animations for determinism
    },
  },
  use: {
    // ... existing ...
    viewport: { width: 1440, height: 900 }, // Fixed size for consistency
  },
});
```

### Visual Tests

```typescript
// tests/e2e/visual-regression.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression: Timeline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Set up a known project state
    await page.evaluate(() => {
      const store = (window as any).__store;
      store.getState().createProject({ name: 'Visual Test', bpm: 120 });
      const drums = store.getState().addTrack('drums');
      const clip = store.getState().addClip(drums.id, {
        startTime: 5, duration: 30,
        prompt: 'visual test clip', lyrics: '',
      });
      store.getState().updateClipStatus(clip.id, 'ready');
    });
    await page.waitForSelector('[data-clip-block]');
  });

  test('timeline renders clips correctly', async ({ page }) => {
    await expect(page).toHaveScreenshot('timeline-with-clip.png');
  });

  test('clip after horizontal drag', async ({ page }) => {
    const clipEl = page.locator('[data-clip-block]').first();
    const box = await clipEl.boundingBox();
    
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + 150, box!.y + box!.height / 2, { steps: 5 });
    await page.mouse.up();
    
    // Wait for any transitions to settle
    await page.waitForTimeout(200);
    await expect(page).toHaveScreenshot('timeline-after-drag.png');
  });

  test('clip selection ring visible', async ({ page }) => {
    await page.locator('[data-clip-block]').first().click();
    await expect(page).toHaveScreenshot('timeline-clip-selected.png');
  });
});
```

### Updating Baselines

```bash
# Generate initial baselines
npx playwright test --update-snapshots

# After intentional UI changes
npx playwright test --update-snapshots tests/e2e/visual-regression.spec.ts
```

### What Visual Tests Catch That State Tests Don't

- Ghost preview renders correctly during drag
- Clip doesn't visually overflow track lane
- Selection ring appears/disappears properly
- Cross-track highlight renders on correct lane
- Resize handles show correct cursor (`col-resize`)

---

## Canvas-Based Interaction Testing

### The Challenge

`PianoRollCanvas.tsx` renders on HTML5 Canvas — there are no DOM elements for individual notes. All interactions go through `mousedown`/`mousemove`/`mouseup` event handlers on the single `<canvas>` element.

### Strategy: Coordinate Math + State Assertions

Since we can read the canvas's coordinate mapping functions (`beatToX`, `xToBeat`, `pitchToY`, `yToPitch`), we can compute exact pixel positions for notes.

```typescript
// tests/e2e/piano-roll.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Piano Roll Canvas Interactions', () => {
  let trackId: string;
  let clipId: string;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const ids = await page.evaluate(() => {
      const store = (window as any).__store;
      store.getState().createProject({ name: 'Piano Roll Test', bpm: 120 });
      const track = store.getState().addTrack('keyboard', 'pianoRoll');
      const clip = store.getState().ensureMidiClip(track.id, 0, 16);
      return { trackId: track.id, clipId: clip.id };
    });
    trackId = ids.trackId;
    clipId = ids.clipId;
    
    // Open piano roll (double-click on the clip or lane)
    // This depends on your UI flow - adjust accordingly
    await page.evaluate(({ trackId, clipId }) => {
      const uiStore = (window as any).__uiStore; // May need to expose this
      // Or use the store's openPianoRoll method
    }, { trackId, clipId });
  });

  test('click in draw mode creates a note', async ({ page }) => {
    // Get canvas element and its position
    const canvas = page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();

    // Click at a position that corresponds to a specific pitch/beat
    // The exact coordinates depend on scroll position and zoom
    // Use evaluate to compute the right position:
    const clickPos = await page.evaluate(({ clipId }) => {
      // Access the piano roll's coordinate system
      // We need pitch 60 (middle C), beat 0
      const KEYBOARD_WIDTH = 48;
      const KEY_HEIGHT = 14;
      const PIXELS_PER_BEAT = 40; // default zoom
      const MIDI_MAX = 127;
      
      const x = KEYBOARD_WIDTH + 0 * PIXELS_PER_BEAT + 10; // beat 0 + small offset
      const y = (MIDI_MAX - 60) * KEY_HEIGHT + KEY_HEIGHT / 2; // pitch 60
      return { x, y };
    }, { clipId });

    // Adjust for canvas position on page
    const x = canvasBox!.x + clickPos.x;
    const y = canvasBox!.y + clickPos.y;

    await page.mouse.click(x, y);

    // Verify note was created in store
    const notes = await page.evaluate((clipId) => {
      const clip = (window as any).__store.getState().getClipById(clipId);
      return clip?.midiData?.notes ?? [];
    }, clipId);

    expect(notes.length).toBe(1);
    expect(notes[0].pitch).toBe(60);
  });

  test('drag note changes its position', async ({ page }) => {
    // First, create a note via store
    const noteId = await page.evaluate((clipId) => {
      return (window as any).__store.getState().addMidiNote(clipId, {
        pitch: 60, startBeat: 0, durationBeats: 1, velocity: 100,
      });
    }, clipId);

    // Compute the note's pixel position on canvas
    const canvas = page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();
    
    const notePos = await page.evaluate(() => {
      const KEYBOARD_WIDTH = 48;
      const KEY_HEIGHT = 14;
      const PIXELS_PER_BEAT = 40;
      const MIDI_MAX = 127;
      return {
        x: KEYBOARD_WIDTH + 0 * PIXELS_PER_BEAT + 10,
        y: (MIDI_MAX - 60) * KEY_HEIGHT + KEY_HEIGHT / 2,
      };
    });

    const startX = canvasBox!.x + notePos.x;
    const startY = canvasBox!.y + notePos.y;
    const dragX = 80; // 2 beats worth of pixels
    const dragY = -28; // 2 semitones up (2 * KEY_HEIGHT)

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + dragX, startY + dragY, { steps: 5 });
    await page.mouse.up();

    // Verify note moved
    const updatedNote = await page.evaluate(({ clipId, noteId }) => {
      const clip = (window as any).__store.getState().getClipById(clipId);
      return clip?.midiData?.notes.find((n: any) => n.id === noteId);
    }, { clipId, noteId });

    expect(updatedNote.pitch).toBeGreaterThan(60); // Moved up
    expect(updatedNote.startBeat).toBeGreaterThan(0); // Moved right
  });
});
```

### Exposing Piano Roll State for Testing

Add a test bridge in `PianoRollCanvas.tsx`:

```typescript
// At the end of the component, expose coordinate helpers for testing
useEffect(() => {
  if (typeof window !== 'undefined') {
    (window as any).__pianoRollHelpers = {
      beatToX, xToBeat, pitchToY, yToPitch,
      pixelsPerBeat, keyHeight, prScrollX, prScrollY,
    };
  }
  return () => {
    delete (window as any).__pianoRollHelpers;
  };
}, [beatToX, xToBeat, pitchToY, yToPitch, pixelsPerBeat, keyHeight, prScrollX, prScrollY]);
```

Then in tests:

```typescript
const clickPos = await page.evaluate(({ pitch, beat }) => {
  const h = (window as any).__pianoRollHelpers;
  return { x: h.beatToX(beat), y: h.pitchToY(pitch) + h.keyHeight / 2 };
}, { pitch: 60, beat: 2 });
```

### Alternative: Canvas Pixel Color Testing

For visual verification of canvas content without state:

```typescript
test('note renders on canvas at correct position', async ({ page }) => {
  // Create a note
  await page.evaluate((clipId) => {
    (window as any).__store.getState().addMidiNote(clipId, {
      pitch: 60, startBeat: 0, durationBeats: 2, velocity: 100,
    });
  }, clipId);

  // Wait for canvas repaint
  await page.waitForTimeout(100);

  // Screenshot just the canvas
  const canvas = page.locator('canvas').first();
  await expect(canvas).toHaveScreenshot('piano-roll-single-note.png');
});
```

---

## Agent-Friendly Testing Patterns

### The Core Problem

AI agents (Claude Code, Codex) can:
- ✅ Write code
- ✅ Run tests
- ✅ Read test output (pass/fail)
- ❌ See screenshots visually
- ❌ Verify "does this look right?"

### Solution: State-First Assertions

Every drag test should assert on **Zustand store state**, not on visual appearance:

```typescript
// ❌ BAD — Requires human eyes
test('clip looks right after drag', async ({ page }) => {
  // ... drag ...
  // How does the agent know if the screenshot is "correct"?
  await expect(page).toHaveScreenshot('clip-dragged.png');
});

// ✅ GOOD — Agent can verify pass/fail
test('clip state is correct after drag', async ({ page }) => {
  // ... drag ...
  const clip = await getClipById(page, clipId);
  expect(clip.startTime).toBeCloseTo(expectedStart, 1);
  expect(clip.duration).toBe(originalDuration);
  expect(clip.trackId).toBe(expectedTrackId);
});
```

### Pattern: Snapshot State Before/After

```typescript
// tests/e2e/helpers/state-snapshot.ts
export async function captureProjectSnapshot(page: Page) {
  return page.evaluate(() => {
    const project = (window as any).__store.getState().project;
    if (!project) return null;
    return {
      tracks: project.tracks.map((t: any) => ({
        id: t.id,
        name: t.trackName,
        clips: t.clips.map((c: any) => ({
          id: c.id,
          startTime: c.startTime,
          duration: c.duration,
          audioOffset: c.audioOffset,
        })),
      })),
    };
  });
}

// Usage in test
test('drag preserves project integrity', async ({ page }) => {
  const before = await captureProjectSnapshot(page);
  // ... perform drag ...
  const after = await captureProjectSnapshot(page);
  
  // Verify only expected changes occurred
  expect(after.tracks.length).toBe(before.tracks.length);
  // ... specific assertions ...
});
```

### Pattern: Data-TestId for Reliable Element Location

Add `data-testid` attributes for stable test selectors:

```tsx
// In ClipBlock.tsx
<div
  ref={clipBlockRef}
  data-testid={`clip-${clip.id}`}
  data-clip-block
  data-clip-id={clip.id}
  data-track-id={track.id}
  data-start-time={clip.startTime}
  data-duration={clip.duration}
  // ... rest of props
>
```

```tsx
// In TrackLane.tsx
<div
  data-testid={`track-lane-${track.id}`}
  data-track-id={track.id}
  // ...
>
```

This lets tests locate elements precisely:

```typescript
const clipEl = page.locator(`[data-clip-id="${clipId}"]`);
const targetLane = page.locator(`[data-track-id="${targetTrackId}"]`);
```

---

## Drag Test Harness for AI Agents

### Concept: A Reusable Test Utility That AI Agents Can Call

```typescript
// tests/e2e/helpers/drag-harness.ts
import { Page, expect } from '@playwright/test';

interface DragResult {
  before: {
    clipState: any;
    screenshot?: string;
  };
  after: {
    clipState: any;
    screenshot?: string;
  };
  dragInfo: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    mode: 'move' | 'resize-left' | 'resize-right';
  };
}

export class DragTestHarness {
  constructor(private page: Page) {}

  async setupProject(config?: {
    bpm?: number;
    tracks?: Array<{ name: string; type?: string }>;
    clips?: Array<{ trackIndex: number; startTime: number; duration: number; prompt?: string }>;
  }) {
    return this.page.evaluate((cfg) => {
      const store = (window as any).__store;
      store.getState().createProject({
        name: 'Harness Test',
        bpm: cfg?.bpm ?? 120,
      });

      const trackIds: string[] = [];
      for (const t of cfg?.tracks ?? [{ name: 'drums' }]) {
        const track = store.getState().addTrack(t.name, t.type);
        trackIds.push(track.id);
      }

      const clipIds: string[] = [];
      for (const c of cfg?.clips ?? []) {
        const clip = store.getState().addClip(trackIds[c.trackIndex], {
          startTime: c.startTime,
          duration: c.duration,
          prompt: c.prompt ?? 'test',
          lyrics: '',
        });
        store.getState().updateClipStatus(clip.id, 'ready');
        clipIds.push(clip.id);
      }

      return { trackIds, clipIds };
    }, config);
  }

  async dragClip(clipId: string, options: {
    deltaX?: number;
    deltaY?: number;
    mode?: 'center' | 'left-edge' | 'right-edge';
    shift?: boolean;
    ctrl?: boolean;
    steps?: number;
  } = {}): Promise<DragResult> {
    const { deltaX = 0, deltaY = 0, mode = 'center', shift = false, ctrl = false, steps = 5 } = options;

    const clipEl = this.page.locator(`[data-clip-id="${clipId}"]`);
    const box = await clipEl.boundingBox();
    if (!box) throw new Error(`Clip ${clipId} not found in DOM`);

    let startX: number;
    const startY = box.y + box.height / 2;

    switch (mode) {
      case 'left-edge':
        startX = box.x + 3;
        break;
      case 'right-edge':
        startX = box.x + box.width - 3;
        break;
      default:
        startX = box.x + box.width / 2;
    }

    // Capture before state
    const beforeState = await this.page.evaluate((id) => {
      return (window as any).__store.getState().getClipById(id);
    }, clipId);

    // Perform drag
    if (shift) await this.page.keyboard.down('Shift');
    if (ctrl) await this.page.keyboard.down('Control');

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + deltaX, startY + deltaY, { steps });
    // Second move for reliability
    await this.page.mouse.move(startX + deltaX, startY + deltaY, { steps: 1 });
    await this.page.mouse.up();

    if (ctrl) await this.page.keyboard.up('Control');
    if (shift) await this.page.keyboard.up('Shift');

    // Capture after state
    const afterState = await this.page.evaluate((id) => {
      return (window as any).__store.getState().getClipById(id);
    }, clipId);

    return {
      before: { clipState: beforeState },
      after: { clipState: afterState },
      dragInfo: {
        startX, startY,
        endX: startX + deltaX,
        endY: startY + deltaY,
        mode: mode === 'left-edge' ? 'resize-left' : mode === 'right-edge' ? 'resize-right' : 'move',
      },
    };
  }

  async assertClipMoved(result: DragResult, direction: 'right' | 'left') {
    if (direction === 'right') {
      expect(result.after.clipState.startTime).toBeGreaterThan(result.before.clipState.startTime);
    } else {
      expect(result.after.clipState.startTime).toBeLessThan(result.before.clipState.startTime);
    }
    expect(result.after.clipState.duration).toBe(result.before.clipState.duration);
  }

  async assertClipResizedRight(result: DragResult) {
    expect(result.after.clipState.startTime).toBe(result.before.clipState.startTime);
    expect(result.after.clipState.duration).not.toBe(result.before.clipState.duration);
  }

  async assertClipOnTrack(clipId: string, trackId: string) {
    const result = await this.page.evaluate(({ clipId, trackId }) => {
      const track = (window as any).__store.getState().getTrackById(trackId);
      return track?.clips.some((c: any) => c.id === clipId) ?? false;
    }, { clipId, trackId });
    expect(result).toBe(true);
  }
}
```

### Usage by AI Agent

```typescript
// An AI agent can write tests like this:
test('new clip drag feature works', async ({ page }) => {
  const harness = new DragTestHarness(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const { trackIds, clipIds } = await harness.setupProject({
    tracks: [{ name: 'drums' }, { name: 'bass' }],
    clips: [{ trackIndex: 0, startTime: 5, duration: 30 }],
  });

  await page.waitForSelector('[data-clip-block]');

  // Test horizontal drag
  const result = await harness.dragClip(clipIds[0], { deltaX: 200 });
  await harness.assertClipMoved(result, 'right');

  // Test resize
  const resizeResult = await harness.dragClip(clipIds[0], {
    mode: 'right-edge',
    deltaX: 100,
  });
  await harness.assertClipResizedRight(resizeResult);
});
```

---

## Tool Recommendations

### Already Installed (Use These)

| Tool | Package | Version | Purpose |
|------|---------|---------|---------|
| Playwright | `@playwright/test` | ^1.58.2 | E2E drag tests, visual regression |
| Vitest | `vitest` | ^4.1.0 | Store-level unit tests |
| Testing Library | `@testing-library/react` | ^16.3.2 | Component render tests |

### Recommended Additions

| Tool | Package | Purpose | Priority |
|------|---------|---------|----------|
| **None required** | — | Current stack is sufficient | — |

### Optional (Nice to Have, Not Urgent)

| Tool | Package | Purpose | When |
|------|---------|---------|------|
| Storybook | `storybook` | Isolate components for visual dev | When team grows |
| Chromatic | `chromatic` | Cloud visual regression | When CI budget exists |
| `jest-canvas-mock` | `jest-canvas-mock` | Mock canvas for unit tests | If canvas unit tests needed |

### Why NOT Additional Tools

- **Percy/Chromatic**: Overkill for a single-developer project. Playwright's `toHaveScreenshot()` is free and sufficient.
- **React DnD testing utils**: Our DAW doesn't use React DnD — it uses raw mouse events. No benefit.
- **Cypress**: Playwright is already set up and better for canvas testing.
- **Canvas testing libraries**: There aren't mature ones. The coordinate-math + state-assertion approach is the standard.

---

## Priority List

### P0 — Test Immediately (Catches Most Common Bugs)

1. **Store: `updateClip` with startTime** — Clip horizontal move
2. **Store: `moveClipToTrack`** — Cross-track clip transfer
3. **Store: `batchMoveClips`** — Multi-select drag
4. **E2E: Clip horizontal drag** — Integration of mouse → state
5. **E2E: Clip resize right** — Most common resize operation
6. **Pure function: `snapToGrid`** — Grid snapping math

### P1 — Test Next (Edge Cases)

7. **Store: `duplicateClipToTrack`** — Shift-drag copy
8. **E2E: Clip resize left** — Complex (adjusts startTime + audioOffset)
9. **E2E: Cross-track drag** — Needs multi-lane coordinate math
10. **Store: MIDI `addMidiNote` + `updateMidiNote`** — Piano roll notes
11. **Pure function: `computeResizeLeftResult`** — After extracting from ClipBlock

### P2 — Test When Stable (Visual + Canvas)

12. **Visual: Timeline with clips** — Baseline screenshot
13. **Visual: Clip after drag** — Catch rendering bugs
14. **E2E: Piano roll note creation** — Canvas click interaction
15. **E2E: Piano roll note drag** — Canvas drag interaction
16. **Store: Sequencer `toggleSequencerStep`** — Simple toggle, low risk

### P3 — Future (When Feature Complete)

17. **E2E: Track reordering** — `reorderTrack` drag
18. **E2E: Loop drag from browser to timeline** — External DnD
19. **Visual: Piano roll full canvas** — Canvas screenshot comparison
20. **E2E: Undo/redo after drag** — `beginDrag`/`endDrag` + undo

---

## Sample Test Code

### Complete Test File: Clip Drag Store Tests

```typescript
// tests/unit/clip-drag-store.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore } from '../../src/store/projectStore';

vi.mock('../../src/services/projectStorage', () => ({
  saveProject: vi.fn(),
}));

describe('Clip Drag Store Operations', () => {
  let drumsId: string;
  let bassId: string;
  let clipId: string;

  beforeEach(() => {
    useProjectStore.setState({ project: null });
    useProjectStore.getState().createProject({ bpm: 120 });
    const drums = useProjectStore.getState().addTrack('drums');
    const bass = useProjectStore.getState().addTrack('bass');
    drumsId = drums.id;
    bassId = bass.id;
    const clip = useProjectStore.getState().addClip(drumsId, {
      startTime: 10,
      duration: 30,
      prompt: 'test drums',
      lyrics: '',
    });
    clipId = clip.id;
  });

  describe('Horizontal move', () => {
    it('moves clip to new start time', () => {
      useProjectStore.getState().updateClip(clipId, { startTime: 20 });
      expect(useProjectStore.getState().getClipById(clipId)?.startTime).toBe(20);
    });

    it('preserves duration when moving', () => {
      useProjectStore.getState().updateClip(clipId, { startTime: 20 });
      expect(useProjectStore.getState().getClipById(clipId)?.duration).toBe(30);
    });

    it('clamps to zero minimum', () => {
      useProjectStore.getState().updateClip(clipId, { startTime: -5 });
      // Note: The store itself may not clamp — the drag handler does.
      // This tests whether the store accepts the value.
      // Real clamping should be in extractable pure functions.
    });
  });

  describe('Cross-track move', () => {
    it('moves clip from drums to bass', () => {
      useProjectStore.getState().moveClipToTrack(clipId, bassId);
      const drums = useProjectStore.getState().getTrackById(drumsId);
      const bass = useProjectStore.getState().getTrackById(bassId);
      expect(drums?.clips.length).toBe(0);
      expect(bass?.clips.some(c => c.id === clipId)).toBe(true);
    });

    it('preserves clip data after cross-track move', () => {
      const original = useProjectStore.getState().getClipById(clipId)!;
      useProjectStore.getState().moveClipToTrack(clipId, bassId);
      const moved = useProjectStore.getState().getClipById(clipId)!;
      expect(moved.prompt).toBe(original.prompt);
      expect(moved.duration).toBe(original.duration);
      expect(moved.startTime).toBe(original.startTime);
    });

    it('moves clip to specific start time on target track', () => {
      useProjectStore.getState().moveClipToTrack(clipId, bassId, 25);
      const moved = useProjectStore.getState().getClipById(clipId);
      expect(moved?.startTime).toBe(25);
    });
  });

  describe('Shift-copy (duplicate to track)', () => {
    it('duplicates clip to same track', () => {
      useProjectStore.getState().duplicateClipToTrack(clipId, drumsId, 50);
      const drums = useProjectStore.getState().getTrackById(drumsId);
      expect(drums?.clips.length).toBe(2);
    });

    it('duplicates clip to different track', () => {
      useProjectStore.getState().duplicateClipToTrack(clipId, bassId, 0);
      const drums = useProjectStore.getState().getTrackById(drumsId);
      const bass = useProjectStore.getState().getTrackById(bassId);
      expect(drums?.clips.length).toBe(1); // Original stays
      expect(bass?.clips.length).toBe(1);
    });

    it('batch duplicate preserves relative positions', () => {
      const clip2 = useProjectStore.getState().addClip(drumsId, {
        startTime: 50, duration: 20, prompt: 'clip2', lyrics: '',
      });
      useProjectStore.getState().batchDuplicateClips([clipId, clip2.id], 10);
      const drums = useProjectStore.getState().getTrackById(drumsId);
      expect(drums?.clips.length).toBe(4); // 2 originals + 2 copies
    });
  });

  describe('Batch move', () => {
    it('shifts multiple clips by offset', () => {
      const clip2 = useProjectStore.getState().addClip(drumsId, {
        startTime: 50, duration: 20, prompt: 'clip2', lyrics: '',
      });
      useProjectStore.getState().batchMoveClips([clipId, clip2.id], 5);
      expect(useProjectStore.getState().getClipById(clipId)?.startTime).toBe(15);
      expect(useProjectStore.getState().getClipById(clip2.id)?.startTime).toBe(55);
    });
  });

  describe('Undo/Redo with drag', () => {
    it('beginDrag captures snapshot, endDrag allows undo', () => {
      const origStart = useProjectStore.getState().getClipById(clipId)?.startTime;
      useProjectStore.getState().beginDrag();
      useProjectStore.getState().updateClip(clipId, { startTime: 30 });
      useProjectStore.getState().updateClip(clipId, { startTime: 35 });
      useProjectStore.getState().endDrag();

      useProjectStore.getState().undo();
      expect(useProjectStore.getState().getClipById(clipId)?.startTime).toBe(origStart);
    });
  });
});
```

### Complete Test File: Drag E2E Spec

```typescript
// tests/e2e/clip-drag.spec.ts
import { test, expect, Page } from '@playwright/test';

// Helper: set up project and return IDs
async function setupDragTest(page: Page) {
  return page.evaluate(() => {
    const store = (window as any).__store;
    store.getState().createProject({ name: 'Drag E2E', bpm: 120 });
    const drums = store.getState().addTrack('drums');
    const bass = store.getState().addTrack('bass');
    const clip = store.getState().addClip(drums.id, {
      startTime: 10, duration: 30,
      prompt: 'drag test', lyrics: '',
    });
    store.getState().updateClipStatus(clip.id, 'ready');
    return { drumsId: drums.id, bassId: bass.id, clipId: clip.id };
  });
}

async function getClipState(page: Page, clipId: string) {
  return page.evaluate((id) => {
    const c = (window as any).__store.getState().getClipById(id);
    return c ? { startTime: c.startTime, duration: c.duration } : null;
  }, clipId);
}

test.describe('Clip Drag E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('horizontal drag right increases startTime', async ({ page }) => {
    const { clipId } = await setupDragTest(page);
    await page.waitForSelector('[data-clip-block]');

    const clipEl = page.locator('[data-clip-block]').first();
    const box = (await clipEl.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    const before = await getClipState(page, clipId);

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 150, cy, { steps: 10 });
    await page.mouse.up();

    const after = await getClipState(page, clipId);
    expect(after!.startTime).toBeGreaterThan(before!.startTime);
    expect(after!.duration).toBe(before!.duration);
  });

  test('horizontal drag left decreases startTime', async ({ page }) => {
    const { clipId } = await setupDragTest(page);
    await page.waitForSelector('[data-clip-block]');

    const clipEl = page.locator('[data-clip-block]').first();
    const box = (await clipEl.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    const before = await getClipState(page, clipId);

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 100, cy, { steps: 10 });
    await page.mouse.up();

    const after = await getClipState(page, clipId);
    expect(after!.startTime).toBeLessThan(before!.startTime);
  });

  test('right-edge drag changes duration only', async ({ page }) => {
    const { clipId } = await setupDragTest(page);
    await page.waitForSelector('[data-clip-block]');

    const clipEl = page.locator('[data-clip-block]').first();
    const box = (await clipEl.boundingBox())!;

    const before = await getClipState(page, clipId);

    // Hover right edge
    await page.mouse.move(box.x + box.width - 3, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width + 80, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();

    const after = await getClipState(page, clipId);
    expect(after!.startTime).toBe(before!.startTime);
    expect(after!.duration).toBeGreaterThan(before!.duration);
  });

  test('small mouse movement does not trigger drag (dead zone)', async ({ page }) => {
    const { clipId } = await setupDragTest(page);
    await page.waitForSelector('[data-clip-block]');

    const clipEl = page.locator('[data-clip-block]').first();
    const box = (await clipEl.boundingBox())!;

    const before = await getClipState(page, clipId);

    // Move less than 3px — should not trigger drag
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 2, box.y + box.height / 2);
    await page.mouse.up();

    const after = await getClipState(page, clipId);
    expect(after!.startTime).toBe(before!.startTime);
  });
});
```

---

## Implementation Roadmap

### Phase 1: Foundations (1-2 days)

1. **Add `data-clip-id` and `data-track-id` attributes** to ClipBlock and TrackLane
2. **Extract drag math** into `src/utils/dragMath.ts` pure functions
3. **Write store-level tests** for clip move/resize/cross-track (the P0 list)
4. **Set up E2E helpers**: `store-bridge.ts` and `DragTestHarness`

### Phase 2: E2E Drag Tests (1-2 days)

5. **Write E2E clip drag tests** (horizontal, resize, dead zone)
6. **Write E2E cross-track drag test**
7. **Write E2E shift-copy test**
8. **Update Playwright config** with screenshot options

### Phase 3: Visual Regression (1 day)

9. **Add visual regression tests** for timeline baseline
10. **Generate initial screenshots**: `npx playwright test --update-snapshots`
11. **Add to CI**: screenshots committed to repo

### Phase 4: Piano Roll (1-2 days)

12. **Expose `__pianoRollHelpers`** for test coordinate mapping
13. **Write MIDI note store tests**
14. **Write canvas interaction E2E tests** (note creation, note drag)

### Phase 5: Agent Harness (ongoing)

15. **Document the DragTestHarness** in `AGENTS.md` or a testing guide
16. **Add harness to Claude Code instructions**: "After modifying drag logic, run `npx playwright test tests/e2e/clip-drag.spec.ts`"
17. **Iterate**: Add tests for each new drag feature as it's built

---

## Key Takeaways

1. **State > Pixels**: Assert on Zustand store state, not visual appearance. This is what makes tests agent-friendly.
2. **Extract pure functions**: The drag math in `ClipBlock.tsx` is inline. Extract it, and you get fast, reliable unit tests.
3. **`page.mouse` with `steps`**: Always use `steps: 5+` for drag simulations. Single-step moves skip critical intermediate events.
4. **`window.__store` is your bridge**: Already exposed. Use it in every E2E test for setup and assertion.
5. **Two moves for reliability**: After the main drag move, do a second `mouse.move()` at the same position — Playwright's docs recommend this for triggering all events.
6. **No new tools needed**: Playwright + Vitest + the existing setup is sufficient. Don't add complexity.
7. **Data attributes**: Add `data-clip-id`, `data-track-id` for stable test selectors.
8. **The test pyramid applies**: 70% store tests, 25% E2E drag tests, 5% visual regression.
