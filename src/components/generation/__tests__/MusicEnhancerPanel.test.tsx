import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MusicEnhancerPanel } from '../MusicEnhancerPanel';
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

function setupProjectWithSelection() {
  useProjectStore.setState({ project: null });
  useProjectStore.getState().createProject();
  useProjectStore.getState().addTrack('custom', 'stems');

  const state = useProjectStore.getState();
  const track = state.project!.tracks[0];

  // Add a clip with audio
  const clip = useProjectStore.getState().addClip(track.id, {
    startTime: 0,
    duration: 10,
    prompt: 'pop song',
    lyrics: 'la la la',
  });

  useProjectStore.getState().updateClip(clip.id, {
    isolatedAudioKey: 'test-audio-key',
  });

  // Set selectWindow and open enhancer
  useUIStore.getState().setSelectWindow({
    startTime: 3.0,
    endTime: 7.0,
    trackIds: [track.id],
  });
  useUIStore.getState().setMusicEnhancerOpen(true);

  return { clipId: clip.id, trackId: track.id };
}

describe('MusicEnhancerPanel', () => {
  beforeEach(() => {
    useProjectStore.setState({ project: null });
    useUIStore.setState({ musicEnhancerOpen: false, selectWindow: null });
    useGenerationStore.setState({ isGenerating: false });
  });

  it('does not render when musicEnhancerOpen is false', () => {
    const { container } = render(<MusicEnhancerPanel />);
    expect(container.innerHTML).toBe('');
  });

  it('renders when musicEnhancerOpen is true', () => {
    setupProjectWithSelection();
    render(<MusicEnhancerPanel />);
    expect(screen.getByTestId('music-enhancer-panel')).toBeDefined();
  });

  it('is a floating panel without backdrop overlay', () => {
    setupProjectWithSelection();
    render(<MusicEnhancerPanel />);
    const panel = screen.getByTestId('music-enhancer-panel');
    // Should have fixed positioning
    expect(panel.className).toContain('fixed');
    // Should NOT have a backdrop/overlay parent with inset-0
    expect(panel.parentElement?.className ?? '').not.toContain('inset-0');
  });

  it('shows "no selection" message when selectWindow is null', () => {
    useUIStore.setState({ musicEnhancerOpen: true, selectWindow: null });
    useProjectStore.getState().createProject();
    render(<MusicEnhancerPanel />);
    expect(screen.getByText(/create a selection/i)).toBeDefined();
  });

  it('displays selection range from selectWindow', () => {
    setupProjectWithSelection();
    render(<MusicEnhancerPanel />);
    expect(screen.getByText(/3\.0/)).toBeDefined();
    expect(screen.getByText(/7\.0/)).toBeDefined();
  });

  it('has a "Select the whole song" button', () => {
    setupProjectWithSelection();
    render(<MusicEnhancerPanel />);
    expect(screen.getByText(/Select the whole song/i)).toBeDefined();
  });

  it('renders the 3-column layout with history, controls, and results', () => {
    setupProjectWithSelection();
    render(<MusicEnhancerPanel />);
    expect(screen.getByTestId('enhancer-history')).toBeDefined();
    expect(screen.getByTestId('enhancer-controls')).toBeDefined();
    expect(screen.getByTestId('enhancer-results')).toBeDefined();
  });

  it('has "Music Enhancer" title', () => {
    setupProjectWithSelection();
    render(<MusicEnhancerPanel />);
    expect(screen.getByText('Music Enhancer')).toBeDefined();
  });

  it('shows lyrics and styles textareas', () => {
    setupProjectWithSelection();
    render(<MusicEnhancerPanel />);
    expect(screen.getByTestId('enhancer-lyrics-input')).toBeDefined();
    expect(screen.getByTestId('enhancer-styles-input')).toBeDefined();
  });

  it('shows consistency toggle with Low/Medium/High', () => {
    setupProjectWithSelection();
    render(<MusicEnhancerPanel />);
    const toggle = screen.getByTestId('enhancer-consistency-toggle');
    expect(within(toggle).getByText('low')).toBeDefined();
    expect(within(toggle).getByText('medium')).toBeDefined();
    expect(within(toggle).getByText('high')).toBeDefined();
  });

  it('sets medium as default consistency', () => {
    setupProjectWithSelection();
    render(<MusicEnhancerPanel />);
    const toggle = screen.getByTestId('enhancer-consistency-toggle');
    const mediumBtn = within(toggle).getByText('medium');
    expect(mediumBtn.className).toContain('bg-teal-600');
  });

  it('switches consistency when clicked', () => {
    setupProjectWithSelection();
    render(<MusicEnhancerPanel />);
    const toggle = screen.getByTestId('enhancer-consistency-toggle');
    const lowBtn = within(toggle).getByText('low');
    fireEvent.click(lowBtn);
    expect(lowBtn.className).toContain('bg-teal-600');
    const mediumBtn = within(toggle).getByText('medium');
    expect(mediumBtn.className).not.toContain('bg-teal-600');
  });

  it('shows the "Enhance" button', () => {
    setupProjectWithSelection();
    render(<MusicEnhancerPanel />);
    expect(screen.getByTestId('enhancer-enhance-btn')).toBeDefined();
    expect(screen.getByTestId('enhancer-enhance-btn').textContent).toBe('Enhance');
  });

  it('shows "Enhancing..." when generating', () => {
    setupProjectWithSelection();
    useGenerationStore.setState({ isGenerating: true });
    render(<MusicEnhancerPanel />);
    const btn = screen.getByTestId('enhancer-enhance-btn');
    expect(btn.textContent).toBe('Enhancing...');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('creates a new session when "New Enhancement" is clicked', () => {
    setupProjectWithSelection();
    render(<MusicEnhancerPanel />);
    expect(screen.getByText('Enhancement 1')).toBeDefined();
    fireEvent.click(screen.getByTestId('enhancer-new-session-btn'));
    expect(screen.getByText('Enhancement 2')).toBeDefined();
  });

  it('closes on Escape key', () => {
    setupProjectWithSelection();
    render(<MusicEnhancerPanel />);
    expect(screen.getByTestId('music-enhancer-panel')).toBeDefined();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useUIStore.getState().musicEnhancerOpen).toBe(false);
  });

  it('closes when close button is clicked', () => {
    setupProjectWithSelection();
    render(<MusicEnhancerPanel />);
    fireEvent.click(screen.getByTestId('enhancer-close-btn'));
    expect(useUIStore.getState().musicEnhancerOpen).toBe(false);
  });

  it('shows empty results message initially', () => {
    setupProjectWithSelection();
    render(<MusicEnhancerPanel />);
    expect(screen.getByText('Enhanced results will appear here')).toBeDefined();
  });
});
