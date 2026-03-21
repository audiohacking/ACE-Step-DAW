import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TimeSignatureLane, parseTimeSignatureInput } from '../TimeSignatureLane';
import { useProjectStore } from '../../../store/projectStore';
import { useUIStore } from '../../../store/uiStore';

vi.mock('../../../services/projectStorage', () => ({
  saveProject: vi.fn(),
}));

describe('TimeSignatureLane', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: null });
    useProjectStore.getState().createProject();
    useUIStore.setState({ pixelsPerSecond: 100 });
  });

  it('rejects non-power-of-two denominators', () => {
    expect(parseTimeSignatureInput('3/3')).toBeNull();
    expect(parseTimeSignatureInput('7/8')).toEqual({ numerator: 7, denominator: 8 });
  });

  it('does not overwrite an existing marker when dragged onto an occupied bar', () => {
    useProjectStore.getState().addTimeSignatureEvent({ bar: 2, numerator: 3, denominator: 4 });
    useProjectStore.getState().addTimeSignatureEvent({ bar: 4, numerator: 5, denominator: 4 });

    render(<TimeSignatureLane />);

    const marker = screen.getByRole('button', { name: /time signature 3\/4 at bar 2/i });
    fireEvent.mouseDown(marker, { button: 0, clientX: 200 });
    fireEvent.mouseMove(window, { clientX: 600 });
    fireEvent.mouseUp(window);

    expect(useProjectStore.getState().project?.timeSignatureMap).toEqual([
      { bar: 2, numerator: 3, denominator: 4 },
      { bar: 4, numerator: 5, denominator: 4 },
    ]);
  });
});
