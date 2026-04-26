import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClipContextMenu } from '../ClipContextMenu';
import { getGrooveLengthBeatsFromMidiNotes } from '../ClipContextMenuContainer';
import type { MidiNote } from '../../../types/project';

const noop = () => {};

const baseProps = {
  x: 100,
  y: 100,
  onClose: noop,
  onInspireMe: noop,
  onAddLayer: noop,
  onMusicEnhancer: noop,
  onEdit: noop,
  onDuplicate: noop,
  onSplitAtPlayhead: noop,
  onConsolidate: noop,
  onDelete: noop,
  onSelectAll: noop,
  onLoopSelection: noop,
  onToggleMute: noop,
  isMuted: false,
  onAssignColor: noop,
  onResetColor: noop,
  hasCustomColor: false,
  canConsolidate: false,
  isMidiClip: true,
};

describe('ClipContextMenu — Extract Groove', () => {
  it('shows Extract Groove option for MIDI clips', () => {
    const onExtractGroove = vi.fn();
    render(
      <ClipContextMenu
        {...baseProps}
        onOpenMidi={noop}
        onExtractGroove={onExtractGroove}
      />,
    );
    expect(screen.getByText(/extract groove/i)).toBeTruthy();
  });

  it('does not show Extract Groove for non-MIDI clips', () => {
    render(
      <ClipContextMenu
        {...baseProps}
        isMidiClip={false}
      />,
    );
    expect(screen.queryByText(/extract groove/i)).toBeNull();
  });

  it('calls onExtractGroove when clicked', () => {
    const onExtractGroove = vi.fn();
    render(
      <ClipContextMenu
        {...baseProps}
        onOpenMidi={noop}
        onExtractGroove={onExtractGroove}
      />,
    );
    fireEvent.click(screen.getByText(/extract groove/i));
    expect(onExtractGroove).toHaveBeenCalledTimes(1);
  });

  it('derives groove length from note content instead of clip region length', () => {
    const notes: MidiNote[] = [
      { id: 'n1', pitch: 60, startBeat: 0, durationBeats: 0.25, velocity: 90 },
      { id: 'n2', pitch: 62, startBeat: 1, durationBeats: 0.25, velocity: 88 },
      { id: 'n3', pitch: 64, startBeat: 2, durationBeats: 0.25, velocity: 86 },
      { id: 'n4', pitch: 65, startBeat: 3, durationBeats: 0.25, velocity: 84 },
    ];

    expect(getGrooveLengthBeatsFromMidiNotes(notes, 4, 0.25)).toBe(4);
  });

  it('rounds longer groove patterns up to the next bar boundary', () => {
    const notes: MidiNote[] = [
      { id: 'n1', pitch: 60, startBeat: 0, durationBeats: 0.25, velocity: 90 },
      { id: 'n2', pitch: 62, startBeat: 5, durationBeats: 0.25, velocity: 88 },
    ];

    expect(getGrooveLengthBeatsFromMidiNotes(notes, 4, 0.25)).toBe(8);
  });
});
