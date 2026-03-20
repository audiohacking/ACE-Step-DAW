import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Timeline } from '../../src/components/timeline/Timeline';
import { useProjectStore } from '../../src/store/projectStore';
import { useTransportStore } from '../../src/store/transportStore';
import { useUIStore } from '../../src/store/uiStore';

vi.mock('../../src/services/projectStorage', () => ({
  saveProject: vi.fn(),
}));

vi.mock('../../src/hooks/useAudioImport', () => ({
  useAudioImport: () => ({
    importMultipleFiles: vi.fn(),
    importLoopToTrack: vi.fn(),
    importAssetToTrack: vi.fn(),
    importAudioFileAsNewQuickSampler: vi.fn(),
    importAssetAsQuickSampler: vi.fn(),
  }),
}));

vi.mock('../../src/components/timeline/TimeRuler', () => ({
  TimeRuler: () => <div data-testid="time-ruler" />,
}));

vi.mock('../../src/components/timeline/ArrangementMarkers', () => ({
  ArrangementMarkers: () => <div data-testid="arrangement-markers" />,
}));

vi.mock('../../src/components/timeline/GridOverlay', () => ({
  GridOverlay: () => <div data-testid="grid-overlay" />,
}));

vi.mock('../../src/components/timeline/Playhead', () => ({
  Playhead: () => <div data-testid="playhead" />,
}));

vi.mock('../../src/components/timeline/Minimap', () => ({
  Minimap: () => <div data-testid="minimap" />,
}));

vi.mock('../../src/components/timeline/TempoLane', () => ({
  TempoLane: () => <div data-testid="tempo-lane" />,
}));

vi.mock('../../src/components/timeline/TrackLane', () => ({
  TrackLane: ({ track }: { track: { id: string } }) => (
    <div data-track-id={track.id} data-testid={`track-lane-${track.id}`} />
  ),
}));

vi.mock('../../src/components/generation/MultiTrackGenerateModal', () => ({
  MultiTrackGenerateModal: () => null,
}));

vi.mock('../../src/components/generation/RegionRegenerateModal', () => ({
  RegionRegenerateModal: () => null,
}));

vi.mock('../../src/components/timeline/RegionContextMenu', () => ({
  RegionContextMenu: () => null,
}));

vi.mock('../../src/components/timeline/InlineSuggestionBadge', () => ({
  InlineSuggestionBadge: () => null,
}));

describe('Timeline auto-scroll', () => {
  beforeEach(() => {
    localStorage.clear();
    useProjectStore.setState(useProjectStore.getInitialState(), true);
    useTransportStore.setState(useTransportStore.getInitialState(), true);
    useUIStore.setState(useUIStore.getInitialState(), true);

    useProjectStore.getState().createProject({ name: 'Timeline Auto Scroll Test' });
    const track = useProjectStore.getState().addTrack('drums');
    useProjectStore.getState().addClip(track.id, {
      startTime: 100,
      duration: 20,
      prompt: 'timeline-tail',
      lyrics: '',
      source: 'generated',
    });
    useUIStore.getState().setPixelsPerSecond(100);
  });

  function setupTimelineViewport(width = 800) {
    render(<Timeline />);

    const timeline = screen.getByRole('grid');
    Object.defineProperty(timeline, 'scrollLeft', {
      value: 0,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(timeline, 'clientWidth', {
      value: width,
      configurable: true,
    });
    Object.defineProperty(timeline, 'scrollWidth', {
      value: 12000,
      configurable: true,
    });
    Object.defineProperty(timeline, 'scrollTop', {
      value: 0,
      writable: true,
      configurable: true,
    });

    vi.spyOn(timeline, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: width,
      bottom: 400,
      width,
      height: 400,
      toJSON: () => ({}),
    });

    return timeline;
  }

  it('scrolls the timeline to keep the playhead visible during playback', async () => {
    const timeline = setupTimelineViewport();

    act(() => {
      useTransportStore.setState({ isPlaying: true, currentTime: 12 });
    });

    await vi.waitFor(() => {
      expect(timeline.scrollLeft).toBeGreaterThan(0);
    });
    expect(useUIStore.getState().scrollX).toBe(timeline.scrollLeft);
  });

  it('temporarily disables auto-scroll after manual scrolling and re-enables it on playback restart', async () => {
    const timeline = setupTimelineViewport();

    act(() => {
      useTransportStore.setState({ isPlaying: true, currentTime: 12 });
    });

    await vi.waitFor(() => {
      expect(timeline.scrollLeft).toBeGreaterThan(0);
    });

    act(() => {
      timeline.scrollLeft = 240;
      fireEvent.scroll(timeline);
    });

    expect(useUIStore.getState().autoScrollEnabled).toBe(false);

    const frozenScrollLeft = timeline.scrollLeft;

    act(() => {
      useTransportStore.setState({ currentTime: 24 });
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(timeline.scrollLeft).toBe(frozenScrollLeft);

    act(() => {
      useTransportStore.setState({ isPlaying: false });
    });

    act(() => {
      useTransportStore.setState({ isPlaying: true, currentTime: 30 });
    });

    await vi.waitFor(() => {
      expect(useUIStore.getState().autoScrollEnabled).toBe(true);
      expect(timeline.scrollLeft).toBeGreaterThan(frozenScrollLeft);
    });
  });
});
