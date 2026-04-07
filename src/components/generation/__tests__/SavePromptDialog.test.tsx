import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SavePromptDialog } from '../SavePromptDialog';
import { useGenerationStore } from '../../../store/generationStore';

describe('SavePromptDialog', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    // Clear library
    const state = useGenerationStore.getState();
    for (const p of state.promptLibrary) {
      state.deleteFromPromptLibrary(p.id);
    }
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <SavePromptDialog open={false} onClose={mockOnClose} initialPrompt="test" />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders dialog when open', () => {
    render(
      <SavePromptDialog open={true} onClose={mockOnClose} initialPrompt="A funky bass line" />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Save to Prompt Library')).toBeInTheDocument();
  });

  it('pre-fills prompt from initialPrompt', () => {
    render(
      <SavePromptDialog open={true} onClose={mockOnClose} initialPrompt="Dreamy synth pad" />,
    );

    const textarea = screen.getByPlaceholderText('Describe the music...');
    expect(textarea).toHaveValue('Dreamy synth pad');
  });

  it('saves prompt to library on Save click', () => {
    render(
      <SavePromptDialog
        open={true}
        onClose={mockOnClose}
        initialPrompt="Rock guitar riff"
        initialMetadata={{ bpm: 140, keyScale: 'E minor' }}
      />,
    );

    // Click Save
    fireEvent.click(screen.getByText('Save'));

    // Check library
    const library = useGenerationStore.getState().promptLibrary;
    expect(library).toHaveLength(1);
    expect(library[0].prompt).toBe('Rock guitar riff');
    expect(library[0].metadata.bpm).toBe(140);

    // Dialog should close
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('disables Save when prompt is empty', () => {
    render(
      <SavePromptDialog open={true} onClose={mockOnClose} initialPrompt="" />,
    );

    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeDisabled();
  });

  it('adds and removes tags', () => {
    render(
      <SavePromptDialog open={true} onClose={mockOnClose} initialPrompt="test" />,
    );

    // Type a tag and press Enter
    const tagInput = screen.getByPlaceholderText('Type and press Enter to add tags');
    fireEvent.change(tagInput, { target: { value: 'funk' } });
    fireEvent.keyDown(tagInput, { key: 'Enter' });

    // Tag should appear
    expect(screen.getByText('funk')).toBeInTheDocument();

    // Remove tag
    const removeButton = screen.getByLabelText('Remove tag funk');
    fireEvent.click(removeButton);

    // Tag should be gone
    expect(screen.queryByText('funk')).not.toBeInTheDocument();
  });

  it('closes on Cancel', () => {
    render(
      <SavePromptDialog open={true} onClose={mockOnClose} initialPrompt="test" />,
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows suggested tags that can be clicked to add', () => {
    render(
      <SavePromptDialog open={true} onClose={mockOnClose} initialPrompt="test" />,
    );

    // Common tags should be visible as suggestions
    const rockButton = screen.getByText('+ rock');
    fireEvent.click(rockButton);

    // Tag should now be in the tag list
    expect(screen.getByText('rock')).toBeInTheDocument();
  });

  it('shows metadata summary when provided', () => {
    render(
      <SavePromptDialog
        open={true}
        onClose={mockOnClose}
        initialPrompt="test"
        initialMetadata={{ bpm: 120, keyScale: 'C major' }}
      />,
    );

    expect(screen.getByText(/BPM 120/)).toBeInTheDocument();
    expect(screen.getByText(/Key C major/)).toBeInTheDocument();
  });
});
