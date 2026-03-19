import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SessionView } from '../../src/components/session/SessionView';
import { useProjectStore } from '../../src/store/projectStore';
import { useTransportStore } from '../../src/store/transportStore';

vi.mock('../../src/services/projectStorage', () => ({
  saveProject: vi.fn(),
}));

describe('SessionView', () => {
  beforeEach(() => {
    useProjectStore.setState(useProjectStore.getInitialState(), true);
    useTransportStore.setState(useTransportStore.getInitialState(), true);
    useProjectStore.getState().createProject();
  });

  it('renders a launch grid and triggers launch actions from the UI', async () => {
    const store = useProjectStore.getState();
    const track = store.addTrack('synth', 'pianoRoll');
    store.addClip(track.id, {
      startTime: 0,
      duration: 2,
      prompt: 'Lead hook',
      globalCaption: '',
      lyrics: '',
      midiData: { notes: [], grid: '1/16' },
      source: 'uploaded',
    });

    render(<SessionView />);

    expect(screen.getByRole('grid', { name: 'Session clip launcher grid' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Launch Scene 1' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Launch Scene 1 clip on/i }));

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(useProjectStore.getState().project?.session?.activeClipIdsByTrackId[track.id]).toBeTruthy();
  });
});
