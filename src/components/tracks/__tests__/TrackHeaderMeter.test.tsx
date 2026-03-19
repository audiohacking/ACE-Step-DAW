import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TrackHeaderMeter } from '../TrackHeaderMeter';

// Mock the audio engine
const engine = {
  getTrackMeter: vi.fn().mockReturnValue({ level: 0, clipped: false }),
  resetTrackClip: vi.fn(),
};

vi.mock('../../../hooks/useAudioEngine', () => ({
  getAudioEngine: () => engine,
}));

describe('TrackHeaderMeter', () => {
  let rafCallbacks: Array<FrameRequestCallback>;
  let rafId: number;

  beforeEach(() => {
    engine.getTrackMeter.mockReset().mockReturnValue({ level: 0, clipped: false });
    engine.resetTrackClip.mockReset();
    rafCallbacks = [];
    rafId = 1;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafId++;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function tickFrame(level: number, clipped = false) {
    engine.getTrackMeter.mockReturnValue({ level, clipped });
    const cbs = [...rafCallbacks];
    rafCallbacks = [];
    cbs.forEach((cb) => cb(performance.now()));
  }

  it('renders with an accessible label', () => {
    render(<TrackHeaderMeter trackId="track-1" />);
    expect(
      screen.getByLabelText('Track header level meter for track-1'),
    ).toBeInTheDocument();
  });

  it('shows a level bar that reflects the current audio level', () => {
    render(<TrackHeaderMeter trackId="track-1" />);
    act(() => tickFrame(0.5));

    const meter = screen.getByLabelText('Track header level meter for track-1');
    const levelBar = meter.querySelector('[data-testid="meter-level"]') as HTMLElement;
    expect(levelBar).toBeTruthy();
    expect(levelBar.style.width).toBe('50%');
  });

  it('shows a peak hold indicator', () => {
    render(<TrackHeaderMeter trackId="track-1" />);
    act(() => tickFrame(0.8));

    const meter = screen.getByLabelText('Track header level meter for track-1');
    const peakHold = meter.querySelector('[data-testid="meter-peak"]') as HTMLElement;
    expect(peakHold).toBeTruthy();
    expect(peakHold.style.left).toBe('80%');
  });

  it('holds the peak after level drops', () => {
    render(<TrackHeaderMeter trackId="track-1" />);
    act(() => tickFrame(0.9));
    act(() => tickFrame(0.2));

    const meter = screen.getByLabelText('Track header level meter for track-1');
    const peakHold = meter.querySelector('[data-testid="meter-peak"]') as HTMLElement;
    expect(peakHold.style.left).toBe('90%');
  });

  it('shows clip indicator when engine reports clipping', () => {
    render(<TrackHeaderMeter trackId="track-1" />);
    act(() => tickFrame(1.0, true));

    const clipIndicator = screen.getByTestId('clip-indicator');
    expect(clipIndicator.className).toMatch(/bg-red/);
  });

  it('clip indicator stays lit after level drops below threshold', () => {
    render(<TrackHeaderMeter trackId="track-1" />);
    act(() => tickFrame(1.0, true));
    act(() => tickFrame(0.3));

    const clipIndicator = screen.getByTestId('clip-indicator');
    expect(clipIndicator.className).toMatch(/bg-red/);
  });

  it('clip indicator resets on click and calls engine.resetTrackClip', () => {
    render(<TrackHeaderMeter trackId="track-1" />);
    act(() => tickFrame(1.0, true));

    const clipIndicator = screen.getByTestId('clip-indicator');
    expect(clipIndicator.className).toMatch(/bg-red/);

    fireEvent.click(clipIndicator);

    expect(engine.resetTrackClip).toHaveBeenCalledWith('track-1');

    // After click + level below threshold, clip indicator should be inactive
    act(() => tickFrame(0.3));
    const resetIndicator = screen.getByTestId('clip-indicator');
    expect(resetIndicator.className).not.toMatch(/bg-red/);
  });

  it('peak hold line turns red when clipping', () => {
    render(<TrackHeaderMeter trackId="track-1" />);
    act(() => tickFrame(1.0, true));

    const meter = screen.getByLabelText('Track header level meter for track-1');
    const peakHold = meter.querySelector('[data-testid="meter-peak"]') as HTMLElement;
    expect(peakHold.className).toMatch(/bg-red/);
  });

  it('uses green color for normal levels', () => {
    render(<TrackHeaderMeter trackId="track-1" />);
    act(() => tickFrame(0.15));

    const meter = screen.getByLabelText('Track header level meter for track-1');
    const levelBar = meter.querySelector('[data-testid="meter-level"]') as HTMLElement;
    expect(levelBar.style.background).toContain('rgb(34, 197, 94)');
  });

  it('uses yellow color for medium levels', () => {
    render(<TrackHeaderMeter trackId="track-1" />);
    act(() => tickFrame(0.35));

    const meter = screen.getByLabelText('Track header level meter for track-1');
    const levelBar = meter.querySelector('[data-testid="meter-level"]') as HTMLElement;
    expect(levelBar.style.background).toContain('rgb(250, 204, 21)');
  });

  it('uses red color for hot levels', () => {
    render(<TrackHeaderMeter trackId="track-1" />);
    act(() => tickFrame(0.85));

    const meter = screen.getByLabelText('Track header level meter for track-1');
    const levelBar = meter.querySelector('[data-testid="meter-level"]') as HTMLElement;
    expect(levelBar.style.background).toContain('rgb(239, 68, 68)');
  });

  it('cleans up animation frame on unmount', () => {
    const { unmount } = render(<TrackHeaderMeter trackId="track-1" />);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});
