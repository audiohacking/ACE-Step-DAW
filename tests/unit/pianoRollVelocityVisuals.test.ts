import { describe, expect, it } from 'vitest';
import {
  getVelocityLaneBarVisualStyle,
  getPianoRollNoteVisualStyle,
  normalizeMidiVelocity,
  VELOCITY_LANE_HEIGHT,
  velocityToBarColor,
  velocityToColor,
} from '../../src/components/pianoroll/PianoRollConstants';

function parseRgbChannels(color: string) {
  const match = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+)\s*)?\)$/);
  expect(match).not.toBeNull();

  return {
    red: Number(match![1]),
    green: Number(match![2]),
    blue: Number(match![3]),
    alpha: match![4] === undefined ? 1 : Number(match![4]),
  };
}

describe('Piano roll velocity visuals', () => {
  it('normalizes both 0..1 and 1..127 velocity inputs onto the same MIDI scale', () => {
    expect(normalizeMidiVelocity(0)).toBe(1);
    expect(normalizeMidiVelocity(0.25)).toBe(32);
    expect(normalizeMidiVelocity(0.5)).toBe(64);
    expect(normalizeMidiVelocity(1)).toBe(127);
    expect(normalizeMidiVelocity(64)).toBe(64);
    expect(normalizeMidiVelocity(200)).toBe(127);
  });

  it('renders equivalent normalized and MIDI velocity inputs with the same note/bar colors', () => {
    expect(velocityToColor(0.25)).toBe(velocityToColor(32));
    expect(velocityToColor(0.5)).toBe(velocityToColor(64));
    expect(velocityToColor(0.9)).toBe(velocityToColor(114));

    expect(velocityToBarColor(0.25)).toBe(velocityToBarColor(32));
    expect(velocityToBarColor(0.5)).toBe(velocityToBarColor(64));
    expect(velocityToBarColor(0.9)).toBe(velocityToBarColor(114));

    const lowBar = parseRgbChannels(velocityToBarColor(24));
    const highBar = parseRgbChannels(velocityToBarColor(118));
    expect(lowBar.alpha).toBeCloseTo(0.8);
    expect(highBar.alpha).toBeCloseTo(0.8);
    expect(highBar.red).toBeGreaterThan(lowBar.red);
    expect(highBar.blue).toBeLessThan(lowBar.blue);
  });

  it('keeps the exported velocity lane height aligned with the piano roll layout contract', () => {
    expect(VELOCITY_LANE_HEIGHT).toBeGreaterThan(0);
    expect(Number.isInteger(VELOCITY_LANE_HEIGHT)).toBe(true);
  });

  it('derives distinct note colors for low and high velocities while preserving readable selection styling', () => {
    const lowVelocityNote = getPianoRollNoteVisualStyle(20, { isSelected: false, isSlide: false });
    const highVelocityNote = getPianoRollNoteVisualStyle(120, { isSelected: true, isSlide: false });

    expect(lowVelocityNote.fillStyle).not.toBe(highVelocityNote.fillStyle);
    expect(lowVelocityNote.globalAlpha).toBe(0.8);
    expect(highVelocityNote.globalAlpha).toBe(1);
    expect(highVelocityNote.strokeStyle).toBe('#fff');
    expect(highVelocityNote.strokeWidth).toBe(1.5);
    expect(highVelocityNote.velocityAccentOpacity).toBeGreaterThan(lowVelocityNote.velocityAccentOpacity);
  });

  it('keeps slide notes and velocity-lane bars visually distinct from normal notes', () => {
    const slideNote = getPianoRollNoteVisualStyle(32, { isSelected: false, isSlide: true });
    const regularBar = getVelocityLaneBarVisualStyle(32, { isSelected: false, isSlide: false });
    const selectedSlideBar = getVelocityLaneBarVisualStyle(96, { isSelected: true, isSlide: true });

    expect(slideNote.fillStyle).toBe('rgba(251, 191, 36, 0.92)');
    expect(slideNote.strokeStyle).toBe('rgba(251,191,36,0.9)');
    expect(regularBar.fillStyle).toBe(velocityToBarColor(32));
    expect(regularBar.globalAlpha).toBe(0.6);
    expect(selectedSlideBar.fillStyle).toBe('rgba(251,191,36,0.85)');
    expect(selectedSlideBar.globalAlpha).toBe(1);
    expect(selectedSlideBar.highlightAlpha).toBeGreaterThan(regularBar.highlightAlpha);
  });
});
