import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MixerPanel } from '../../src/components/mixer/MixerPanel';
import { useProjectStore } from '../../src/store/projectStore';
import { useUIStore } from '../../src/store/uiStore';

vi.mock('../../src/components/mixer/LevelMeter', () => ({
  LevelMeter: ({ trackId }: { trackId: string }) => (
    <div aria-label={`Track level meter for ${trackId}`} data-testid={`level-meter-${trackId}`} className="h-full w-2" />
  ),
}));

vi.mock('../../src/components/ui/Knob', () => ({
  Knob: ({ label }: { label: string }) => <div data-testid={`knob-${label}`}>{label}</div>,
}));

vi.mock('../../src/hooks/useAudioEngine', () => ({
  getAudioEngine: () => ({
    masterVolume: 1,
    getTrackLevel: () => 0,
  }),
}));

describe('MixerPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    useProjectStore.setState(useProjectStore.getInitialState(), true);
    useUIStore.setState(useUIStore.getInitialState(), true);

    useProjectStore.getState().createProject({ name: 'Mixer Test', bpm: 120 });
    useProjectStore.getState().addTrack('drums');
    useUIStore.getState().setShowMixer(true);
    useUIStore.getState().setMixerHeight(220);
  });

  it('keeps the fader area inside the strip and enables vertical scrolling when space is tight', () => {
    render(<MixerPanel />);

    const track = useProjectStore.getState().project!.tracks[0];
    const scroller = screen.getByTestId('mixer-panel-scroller');
    const channelControls = screen.getByTestId(`mixer-channel-controls-${track.id}`);
    const channelFaderArea = screen.getByTestId(`mixer-channel-fader-area-${track.id}`);
    const channelFader = channelFaderArea.querySelector('input[type="range"]');
    const masterFaderArea = screen.getByTestId('mixer-master-fader-area');
    const masterFader = masterFaderArea.querySelector('input[type="range"]');

    expect(scroller.className).toContain('overflow-y-auto');
    expect(channelControls.className).toContain('overflow-y-auto');
    expect(channelFaderArea).toHaveStyle({ height: '168px' });
    expect(masterFaderArea.className).toContain('min-h-[112px]');
    expect(channelFader).toHaveStyle({ height: '100%' });
    expect(masterFader).toHaveStyle({ height: '100%' });
  });
});
