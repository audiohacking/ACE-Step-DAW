import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TrackHeader } from '../../src/components/tracks/TrackHeader';
import { useProjectStore } from '../../src/store/projectStore';
import type { Project, Track } from '../../src/types/project';

vi.mock('../../src/services/projectStorage', () => ({
  saveProject: vi.fn(),
}));

vi.mock('../../src/services/freezeTrack', () => ({
  freezeTrackToAudio: vi.fn(),
  flattenTrackToAudio: vi.fn(),
}));

vi.mock('../../src/hooks/useRecording', () => ({
  useRecording: () => ({
    armedTrackIds: [],
    toggleArmTrack: vi.fn(),
  }),
}));

function createTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'track-1',
    trackType: 'sample',
    trackName: 'vocals',
    displayName: 'Lead Vox',
    color: '#f43f5e',
    order: 0,
    volume: 0.8,
    muted: false,
    soloed: false,
    inputMonitoring: 'off',
    clips: [],
    ...overrides,
  };
}

function createProject(track: Track): Project {
  return {
    id: 'project-1',
    name: 'Test Project',
    createdAt: 1,
    updatedAt: 1,
    bpm: 120,
    keyScale: 'C major',
    timeSignature: 4,
    totalDuration: 16,
    tracks: [track],
    generationDefaults: {
      inferenceSteps: 30,
      guidanceScale: 7.5,
      shift: 0,
      thinking: false,
      model: 'test-model',
    },
    automationLanes: [],
  };
}

describe('TrackHeader', () => {
  beforeEach(() => {
    useProjectStore.setState(useProjectStore.getInitialState(), true);
  });

  it('shows only primary actions by default and reveals secondary actions in overflow', () => {
    const track = createTrack();
    useProjectStore.setState((state) => ({ ...state, project: createProject(track) }));

    render(
      <TrackHeader
        track={track}
        onDragStart={vi.fn()}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
        isDragOver={false}
        dragOverPosition={null}
      />,
    );

    expect(screen.getByLabelText('Mute Lead Vox')).toBeInTheDocument();
    expect(screen.getByLabelText('Solo Lead Vox')).toBeInTheDocument();
    expect(screen.getByLabelText('Record arm Lead Vox')).toBeInTheDocument();
    expect(screen.getByLabelText('More track actions Lead Vox')).toBeInTheDocument();

    expect(screen.queryByLabelText('Input monitoring Lead Vox: off')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Freeze Lead Vox')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Toggle automation Lead Vox')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Remove Lead Vox')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('More track actions Lead Vox'));

    expect(screen.getByLabelText('Input monitoring Lead Vox: off')).toBeInTheDocument();
    expect(screen.getByLabelText('Freeze Lead Vox')).toBeInTheDocument();
    expect(screen.getByLabelText('Toggle automation Lead Vox')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Lead Vox')).toBeInTheDocument();
  });

  it('uses distinct solo and input monitoring icons', () => {
    const track = createTrack();
    useProjectStore.setState((state) => ({ ...state, project: createProject(track) }));

    render(
      <TrackHeader
        track={track}
        onDragStart={vi.fn()}
        onDragOver={vi.fn()}
        onDrop={vi.fn()}
        isDragOver={false}
        dragOverPosition={null}
      />,
    );

    fireEvent.click(screen.getByLabelText('More track actions Lead Vox'));

    expect(screen.getByTestId('track-solo-icon').innerHTML).not.toEqual(
      screen.getByTestId('track-input-monitor-icon').innerHTML,
    );
  });
});
