import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MixerPanel } from '../../src/components/mixer/MixerPanel';
import { useProjectStore } from '../../src/store/projectStore';
import { useUIStore } from '../../src/store/uiStore';

vi.mock('../../src/services/projectStorage', () => ({
  saveProject: vi.fn(),
}));

vi.mock('../../src/hooks/useAudioEngine', () => ({
  getAudioEngine: () => ({
    masterVolume: 1,
    getMasterLevel: () => 0,
    getTrackLevel: () => 0,
    getMasterMeter: () => ({ level: 0, clipped: false }),
    getTrackMeter: () => ({ level: 0, clipped: false }),
    resetTrackClip: vi.fn(),
    resetMasterClip: vi.fn(),
  }),
}));

function setupProject() {
  useProjectStore.getState().createProject({ name: 'Fader Visibility Test' });
  useProjectStore.getState().addTrack('drums');
  useUIStore.getState().setShowMixer(true);
  useUIStore.getState().setMixerHeight(500);
}

describe('Fader visibility — issue #268', () => {
  beforeEach(() => {
    localStorage.clear();
    useProjectStore.setState(useProjectStore.getInitialState(), true);
    useUIStore.setState(useUIStore.getInitialState(), true);
    setupProject();
  });

  it('channel strip has overflow-hidden to prevent fader clipping', () => {
    render(<MixerPanel />);
    const strip = screen.getAllByTestId('channel-strip')[0];
    expect(strip.className).toMatch(/overflow-hidden/);
  });

  it('fader region is rendered with shrink-0 to guarantee its space', () => {
    render(<MixerPanel />);
    const faderRegion = screen.getAllByTestId('fader-region')[0];
    expect(faderRegion.className).toMatch(/shrink-0/);
  });

  it('fader region has a minimum height of at least 96px', () => {
    render(<MixerPanel />);
    const faderRegion = screen.getAllByTestId('fader-region')[0];
    expect(faderRegion.className).toMatch(/min-h-\[96px\]/);
  });

  it('volume fader is fully interactive at minimum mixer height', () => {
    useUIStore.getState().setMixerHeight(360);
    render(<MixerPanel />);
    const fader = screen.getByRole('slider', { name: 'Drums volume fader' });
    expect(fader).toBeInTheDocument();
    expect(fader).not.toBeDisabled();
  });

  it('master fader region also has shrink-0 and min-height', () => {
    render(<MixerPanel />);
    const masterFaderRegion = screen.getByTestId('master-fader-region');
    expect(masterFaderRegion.className).toMatch(/shrink-0/);
    expect(masterFaderRegion.className).toMatch(/min-h-\[96px\]/);
  });
});
