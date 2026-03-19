import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimeRuler } from '../../src/components/timeline/TimeRuler';
import { useProjectStore } from '../../src/store/projectStore';
import { useUIStore } from '../../src/store/uiStore';
import { useTransportStore } from '../../src/store/transportStore';

const seekMock = vi.fn();

vi.mock('../../src/hooks/useTransport', () => ({
  useTransport: () => ({
    startScrub: (time: number) => {
      useTransportStore.getState().startScrub(time);
      seekMock(time);
    },
    scrubTo: (time: number, rate: number) => {
      useTransportStore.getState().updateScrub(time, rate);
      seekMock(time);
    },
    endScrub: () => {
      useTransportStore.getState().endScrub();
    },
  }),
}));

vi.mock('../../src/services/projectStorage', () => ({
  saveProject: vi.fn(),
}));

describe('TimeRuler scrubbing', () => {
  beforeEach(() => {
    seekMock.mockReset();
    localStorage.clear();
    useProjectStore.setState(useProjectStore.getInitialState(), true);
    useUIStore.setState(useUIStore.getInitialState(), true);
    useTransportStore.setState(useTransportStore.getInitialState(), true);

    useProjectStore.getState().createProject({ name: 'Scrub Test' });
    useUIStore.getState().setPixelsPerSecond(100);
  });

  it('enters scrub mode and updates transport position while dragging the ruler', () => {
    render(<TimeRuler />);

    const ruler = screen.getByRole('slider', { name: 'Timeline scrub ruler' });
    vi.spyOn(ruler, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 1000,
      bottom: 24,
      width: 1000,
      height: 24,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(ruler, {
      button: 0,
      clientX: 120,
      clientY: 12,
      pointerId: 1,
    });

    let state = useTransportStore.getState();
    expect(state.isScrubbing).toBe(true);
    expect(state.currentTime).toBeCloseTo(1.2);
    expect(seekMock).toHaveBeenCalledWith(1.2);

    fireEvent.pointerMove(ruler, {
      clientX: 220,
      clientY: 12,
      pointerId: 1,
      timeStamp: 32,
    });

    state = useTransportStore.getState();
    expect(state.currentTime).toBeCloseTo(2.2);
    expect(state.scrubPreviewRate).toBeGreaterThan(0);
    expect(seekMock).toHaveBeenLastCalledWith(2.2);

    fireEvent.pointerUp(ruler, {
      clientX: 220,
      clientY: 12,
      pointerId: 1,
    });

    state = useTransportStore.getState();
    expect(state.isScrubbing).toBe(false);
    expect(state.scrubPreviewRate).toBe(0);
  });
});
