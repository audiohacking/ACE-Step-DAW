import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClipContextMenu } from '../ClipContextMenu';

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
});
