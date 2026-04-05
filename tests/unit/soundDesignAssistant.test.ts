import { describe, it, expect } from 'vitest';
import {
  parseSoundDescription,
  SOUND_DESCRIPTORS,
  type ParameterAdjustment,
} from '../../src/services/soundDesignAssistant';

describe('soundDesignAssistant', () => {
  describe('SOUND_DESCRIPTORS', () => {
    it('contains descriptors for common sound qualities', () => {
      const keys = Object.keys(SOUND_DESCRIPTORS);
      expect(keys).toContain('warmer');
      expect(keys).toContain('brighter');
      expect(keys).toContain('fatter');
      expect(keys).toContain('thinner');
      expect(keys).toContain('darker');
      expect(keys).toContain('softer');
      expect(keys).toContain('sharper');
      expect(keys.length).toBeGreaterThanOrEqual(10);
    });

    it('each descriptor has at least one adjustment', () => {
      for (const [key, adjustments] of Object.entries(SOUND_DESCRIPTORS)) {
        expect(adjustments.length).toBeGreaterThanOrEqual(1);
        for (const adj of adjustments) {
          expect(adj.parameter).toBeTruthy();
          expect(typeof adj.delta).toBe('number');
          expect(adj.description).toBeTruthy();
        }
      }
    });
  });

  describe('parseSoundDescription', () => {
    it('parses single descriptor "warmer"', () => {
      const result = parseSoundDescription('make it warmer');
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((a) => a.parameter.includes('filter'))).toBe(true);
    });

    it('parses "brighter" to increase filter cutoff', () => {
      const result = parseSoundDescription('brighter');
      expect(result.some((a) => a.parameter === 'filter.cutoffHz' && a.delta > 0)).toBe(true);
    });

    it('parses "darker" to decrease filter cutoff', () => {
      const result = parseSoundDescription('darker');
      expect(result.some((a) => a.parameter === 'filter.cutoffHz' && a.delta < 0)).toBe(true);
    });

    it('parses "fatter" to add detuning', () => {
      const result = parseSoundDescription('make it fatter');
      expect(result.some((a) => a.parameter.includes('detune') || a.parameter.includes('unison'))).toBe(true);
    });

    it('parses compound descriptions with multiple descriptors', () => {
      const result = parseSoundDescription('warmer and brighter');
      // Should contain adjustments for both warmer AND brighter
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('returns empty array for unrecognized descriptions', () => {
      const result = parseSoundDescription('make it taste like pizza');
      expect(result).toEqual([]);
    });

    it('handles "more" intensifier', () => {
      const normal = parseSoundDescription('brighter');
      const intensified = parseSoundDescription('much brighter');
      // The intensified version should have larger deltas
      const normalDelta = normal.find((a) => a.parameter === 'filter.cutoffHz')?.delta ?? 0;
      const intenseDelta = intensified.find((a) => a.parameter === 'filter.cutoffHz')?.delta ?? 0;
      expect(Math.abs(intenseDelta)).toBeGreaterThanOrEqual(Math.abs(normalDelta));
    });

    it('is case-insensitive', () => {
      const lower = parseSoundDescription('warmer');
      const upper = parseSoundDescription('WARMER');
      expect(lower.length).toBe(upper.length);
      expect(lower[0]?.parameter).toBe(upper[0]?.parameter);
    });
  });
});
