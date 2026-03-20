import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToastContainer } from '../Toast';
import { Knob } from '../Knob';

// Mock useToast to return controlled toast data
vi.mock('../../../hooks/useToast', () => ({
  useToast: () => ({
    toasts: [
      { id: 'test-1', type: 'success' as const, message: 'Test toast', durationMs: 3000 },
    ],
    dismissToast: vi.fn(),
  }),
}));

describe('Toast slide-in animation', () => {
  it('applies translate-x-full and opacity-0 as initial classes for entrance animation', () => {
    render(<ToastContainer />);
    const toastItem = screen.getByTestId('toast-item');
    // Initial state: off-screen with translate-x-full and opacity-0
    expect(toastItem.className).toContain('translate-x-full');
    expect(toastItem.className).toContain('opacity-0');
  });

  it('applies transition-[transform,opacity] duration-200 for smooth entrance', () => {
    render(<ToastContainer />);
    const toastItem = screen.getByTestId('toast-item');
    expect(toastItem.className).toContain('transition-[transform,opacity]');
    expect(toastItem.className).toContain('duration-200');
    expect(toastItem.className).toContain('ease-out');
  });
});

describe('Knob hover animation', () => {
  it('applies transition-transform duration-150 and hover:scale-110 classes', () => {
    render(
      <Knob
        value={0.5}
        min={0}
        max={1}
        defaultValue={0.5}
        onChange={vi.fn()}
        label="Test"
      />
    );
    const knobEl = screen.getByLabelText('Test knob');
    expect(knobEl.className).toContain('transition-transform');
    expect(knobEl.className).toContain('duration-150');
    expect(knobEl.className).toContain('hover:scale-110');
  });

  it('does not apply hover:scale-110 when disabled', () => {
    render(
      <Knob
        value={0.5}
        min={0}
        max={1}
        defaultValue={0.5}
        onChange={vi.fn()}
        label="Disabled"
        disabled
      />
    );
    const knobEl = screen.getByLabelText('Disabled knob');
    expect(knobEl.className).not.toContain('hover:scale-110');
  });
});
