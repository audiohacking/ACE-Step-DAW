import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SharedStemPlayer } from '../../src/components/sharing/SharedStemPlayer';
import type { SharedProjectRecord } from '../../src/services/cloudStorageService';

function createAudioMock() {
  return {
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    currentTime: 0,
    volume: 1,
    muted: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

const sharedProject: SharedProjectRecord = {
  token: 'share_demo',
  projectId: 'project-1',
  owner: 'alice',
  sharedAt: 123456,
  project: {
    id: 'project-1',
    name: 'Shared Project',
    createdAt: 1000,
    updatedAt: 2000,
    bpm: 120,
    keyScale: 'C major',
    timeSignature: 4,
    totalDuration: 32,
    tracks: [],
    generationDefaults: {
      inferenceSteps: 50,
      guidanceScale: 7,
      shift: 3,
      thinking: false,
      model: 'ace-step-v1',
    },
  },
  stems: [
    {
      trackId: 'track-1',
      trackName: 'Vocals',
      color: '#ff4d6d',
      volume: 0.9,
      lyrics: 'hello world',
      audioDataUrl: 'data:audio/mpeg;base64,AAA=',
    },
    {
      trackId: 'track-2',
      trackName: 'Drums',
      color: '#00c2ff',
      volume: 0.7,
      lyrics: '',
      audioDataUrl: 'data:audio/mpeg;base64,BBB=',
    },
  ],
};

describe('SharedStemPlayer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders stem controls and syncs mute, solo, and volume to audio elements', async () => {
    const audioMocks = [createAudioMock(), createAudioMock()];
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'audio') {
        return audioMocks.shift() as unknown as HTMLAudioElement;
      }
      return originalCreateElement(tagName);
    });

    render(<SharedStemPlayer sharedProject={sharedProject} />);

    expect(screen.getByRole('heading', { name: 'Shared Project' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /play shared project/i })).toBeInTheDocument();
    expect(screen.getByText('hello world')).toBeInTheDocument();

    const vocalsMute = screen.getByRole('button', { name: /mute vocals/i });
    fireEvent.click(vocalsMute);
    expect(screen.getByRole('button', { name: /unmute vocals/i })).toBeInTheDocument();

    const drumsSolo = screen.getByRole('button', { name: /solo drums/i });
    fireEvent.click(drumsSolo);
    expect(screen.getByRole('button', { name: /unsolo drums/i })).toBeInTheDocument();

    const vocalsVolume = screen.getByLabelText(/vocals volume/i);
    fireEvent.change(vocalsVolume, { target: { value: '0.35' } });
    expect(vocalsVolume).toHaveValue('0.35');

    expect(createElementSpy).toHaveBeenCalled();
  });
});
