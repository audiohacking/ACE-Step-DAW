import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MixerPanel } from '../MixerPanel';
import { useProjectStore } from '../../../store/projectStore';
import { useUIStore } from '../../../store/uiStore';

vi.mock('../../../services/projectStorage', () => ({
  saveProject: vi.fn(),
}));

vi.mock('../../../hooks/useAudioEngine', () => ({
  getAudioEngine: () => ({
    getTrackLevel: () => 0,
    masterVolume: 1,
    getMasterLevel: () => ({ left: 0, right: 0 }),
    getMasterInputLevel: () => ({ left: 0, right: 0 }),
    getAnalyserData: () => null,
  }),
}));

vi.mock('../SpectrumAnalyzer', () => ({
  SpectrumAnalyzer: () => null,
}));

describe('MixerPanel open/close animation', () => {
  it('renders with transition classes and height 0 when mixer is hidden', () => {
    useProjectStore.getState().createProject();
    useUIStore.setState({ showMixer: false });

    render(<MixerPanel />);
    const panel = screen.getByTestId('mixer-panel');
    expect(panel.className).toContain('transition-[height,opacity]');
    expect(panel.className).toContain('duration-150');
    expect(panel.className).toContain('ease-out');
    expect(panel.style.height).toBe('0px');
    expect(panel.style.opacity).toBe('0');
  });

  it('renders with full height and opacity 1 when mixer is shown', () => {
    useProjectStore.getState().createProject();
    useUIStore.setState({ showMixer: true, mixerHeight: 400 });

    render(<MixerPanel />);
    const panel = screen.getByTestId('mixer-panel');
    expect(panel.style.opacity).toBe('1');
    expect(parseInt(panel.style.height)).toBeGreaterThan(0);
  });
});
