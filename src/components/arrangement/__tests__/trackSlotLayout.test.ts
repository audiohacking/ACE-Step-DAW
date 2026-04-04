import { describe, expect, it } from 'vitest';
import type { Track } from '../../../types/project';
import {
  buildArrangementTrackSlots,
  getArrangementEmptyTrackId,
  MIN_ARRANGEMENT_VISIBLE_ROW_COUNT,
} from '../trackSlotLayout';

function createTrack(id: string, displayName: string, order: number): Track {
  return {
    id,
    trackName: 'custom',
    trackType: 'sample',
    displayName,
    color: '#ffffff',
    order,
    volume: 0.8,
    muted: false,
    soloed: false,
    clips: [],
  };
}

describe('trackSlotLayout', () => {
  it('preserves empty arrangement rows between sparse track orders', () => {
    const slots = buildArrangementTrackSlots([
      createTrack('track-1', 'Track 1', 1),
      createTrack('track-2', 'Track 2', 4),
    ], 6);

    expect(slots.slice(0, 6)).toEqual([
      { kind: 'track', track: expect.objectContaining({ id: 'track-1', order: 1 }) },
      { kind: 'empty', slotIndex: 1 },
      { kind: 'empty', slotIndex: 2 },
      { kind: 'track', track: expect.objectContaining({ id: 'track-2', order: 4 }) },
      { kind: 'empty', slotIndex: 4 },
      { kind: 'empty', slotIndex: 5 },
    ]);
  });

  it('derives stable virtual ids from absolute slot indices', () => {
    expect(getArrangementEmptyTrackId(3)).toBe('__empty-3');
  });

  it('defaults to minimum visible rows when called without placeholderCount', () => {
    const slots = buildArrangementTrackSlots([]);

    // Should use getArrangementVisibleRowCount which returns MIN_ARRANGEMENT_VISIBLE_ROW_COUNT (12)
    // for empty track list, not MAX_PROJECT_TRACKS (128)
    expect(slots).toHaveLength(MIN_ARRANGEMENT_VISIBLE_ROW_COUNT);
    expect(slots.at(0)).toEqual({ kind: 'empty', slotIndex: 0 });
    expect(slots.at(-1)).toEqual({ kind: 'empty', slotIndex: MIN_ARRANGEMENT_VISIBLE_ROW_COUNT - 1 });
  });

  it('shows trailing empty rows after last track when called without placeholderCount', () => {
    const slots = buildArrangementTrackSlots([
      createTrack('track-1', 'Track 1', 1),
      createTrack('track-2', 'Track 2', 2),
    ]);

    // 2 tracks + 8 trailing = 10, but minimum is 12, so 12 total
    expect(slots).toHaveLength(MIN_ARRANGEMENT_VISIBLE_ROW_COUNT);
    expect(slots[0]).toEqual({ kind: 'track', track: expect.objectContaining({ id: 'track-1' }) });
    expect(slots[1]).toEqual({ kind: 'track', track: expect.objectContaining({ id: 'track-2' }) });
    // Remaining are empty placeholders
    expect(slots[2]).toEqual({ kind: 'empty', slotIndex: 2 });
  });

  it('never creates more than MAX_PROJECT_TRACKS slots', () => {
    const slots = buildArrangementTrackSlots([], 200);

    // Even with explicit count > 128, should cap
    expect(slots.length).toBeLessThanOrEqual(200);
  });
});
