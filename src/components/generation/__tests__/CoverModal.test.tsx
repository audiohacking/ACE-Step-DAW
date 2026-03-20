import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CoverModal } from '../CoverModal';
import { useProjectStore } from '../../../store/projectStore';
import { useUIStore } from '../../../store/uiStore';
import { useGenerationStore } from '../../../store/generationStore';

// Mock external dependencies
vi.mock('../../../services/projectStorage', () => ({
  saveProject: vi.fn(),
}));

vi.mock('../../../services/generationPipeline', () => ({
  generateCoverClip: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../services/aceStepApi', () => ({
  modelSupportsTaskType: vi.fn().mockReturnValue(true),
}));

function setupClipAndModal() {
  // Create a project with a track
  useProjectStore.setState({ project: null });
  useProjectStore.getState().createProject();
  useProjectStore.getState().addTrack('custom', 'stems');

  const state = useProjectStore.getState();
  const track = state.project!.tracks[0];

  // Add a clip to the track
  const clip = useProjectStore.getState().addClip(track.id, {
    startTime: 0,
    duration: 10,
    prompt: 'pop song',
    lyrics: 'la la la',
  });

  // Give the clip audio so enhance is enabled
  useProjectStore.getState().updateClip(clip.id, {
    isolatedAudioKey: 'test-audio-key',
  });

  // Open the cover modal for this clip
  useUIStore.getState().setCoverModal(clip.id);

  return { clipId: clip.id, trackId: track.id };
}

describe('CoverModal', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: null });
    useUIStore.setState({ coverClipId: null });
    useGenerationStore.setState({ isGenerating: false });
  });

  it('does not render when coverClipId is null', () => {
    const { container } = render(<CoverModal />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the modal with "Music Enhancer" title', () => {
    setupClipAndModal();
    render(<CoverModal />);
    expect(screen.getByText('Music Enhancer')).toBeDefined();
  });

  it('has a 3-panel layout', () => {
    setupClipAndModal();
    render(<CoverModal />);
    const modal = screen.getByTestId('cover-modal');
    // Left sidebar with new session button
    expect(screen.getByTestId('new-session-btn')).toBeDefined();
    // Center with controls
    expect(screen.getByTestId('styles-input')).toBeDefined();
    expect(screen.getByTestId('lyrics-input')).toBeDefined();
    // Right with results
    expect(screen.getByTestId('results-list')).toBeDefined();
  });

  it('shows consistency toggle with Low/Medium/High instead of slider', () => {
    setupClipAndModal();
    render(<CoverModal />);
    const toggle = screen.getByTestId('consistency-toggle');
    expect(within(toggle).getByText('low')).toBeDefined();
    expect(within(toggle).getByText('medium')).toBeDefined();
    expect(within(toggle).getByText('high')).toBeDefined();
  });

  it('sets medium as default consistency', () => {
    setupClipAndModal();
    render(<CoverModal />);
    const toggle = screen.getByTestId('consistency-toggle');
    const mediumBtn = within(toggle).getByText('medium');
    expect(mediumBtn.className).toContain('bg-teal-600');
  });

  it('switches consistency when clicked', () => {
    setupClipAndModal();
    render(<CoverModal />);
    const toggle = screen.getByTestId('consistency-toggle');
    const lowBtn = within(toggle).getByText('low');
    fireEvent.click(lowBtn);
    expect(lowBtn.className).toContain('bg-teal-600');
    const mediumBtn = within(toggle).getByText('medium');
    expect(mediumBtn.className).not.toContain('bg-teal-600');
  });

  it('shows the "Enhance" button instead of "Generate Cover"', () => {
    setupClipAndModal();
    render(<CoverModal />);
    expect(screen.getByTestId('enhance-btn')).toBeDefined();
    expect(screen.getByTestId('enhance-btn').textContent).toBe('Enhance');
  });

  it('disables the Enhance button when generating', () => {
    setupClipAndModal();
    useGenerationStore.setState({ isGenerating: true });
    render(<CoverModal />);
    const btn = screen.getByTestId('enhance-btn');
    expect(btn.textContent).toBe('Enhancing...');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('creates a new session when "New Enhancement" is clicked', () => {
    setupClipAndModal();
    render(<CoverModal />);
    // Initially one session
    expect(screen.getByText('Enhancement 1')).toBeDefined();
    fireEvent.click(screen.getByTestId('new-session-btn'));
    expect(screen.getByText('Enhancement 2')).toBeDefined();
  });

  it('closes on Escape key', () => {
    setupClipAndModal();
    render(<CoverModal />);
    expect(screen.getByTestId('cover-modal')).toBeDefined();
    fireEvent.keyDown(window, { key: 'Escape' });
    // After Escape, coverClipId should be null
    expect(useUIStore.getState().coverClipId).toBeNull();
  });

  it('closes when close button is clicked', () => {
    setupClipAndModal();
    render(<CoverModal />);
    fireEvent.click(screen.getByTestId('cover-modal-close'));
    expect(useUIStore.getState().coverClipId).toBeNull();
  });

  it('shows empty results message initially', () => {
    setupClipAndModal();
    render(<CoverModal />);
    expect(screen.getByText('Enhanced results will appear here')).toBeDefined();
  });

  it('populates lyrics and styles from clip data', () => {
    setupClipAndModal();
    render(<CoverModal />);
    const lyricsInput = screen.getByTestId('lyrics-input') as HTMLTextAreaElement;
    const stylesInput = screen.getByTestId('styles-input') as HTMLTextAreaElement;
    expect(lyricsInput.value).toBe('la la la');
    expect(stylesInput.value).toBe('pop song');
  });

  it('calls generateCoverClip when Enhance is clicked', async () => {
    const { generateCoverClip } = await import('../../../services/generationPipeline');
    setupClipAndModal();
    render(<CoverModal />);
    fireEvent.click(screen.getByTestId('enhance-btn'));
    expect(generateCoverClip).toHaveBeenCalled();
  });

  it('adds a result entry after clicking Enhance', () => {
    setupClipAndModal();
    render(<CoverModal />);
    fireEvent.click(screen.getByTestId('enhance-btn'));
    // A result should appear in the results list
    const resultsList = screen.getByTestId('results-list');
    expect(resultsList.textContent).toContain('pop song');
  });
});
