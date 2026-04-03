import { describe, it, expect } from 'vitest';
import { generateLimiterCurve } from '../limiterCurve';

describe('limiterCurve', () => {
  describe('generateLimiterCurve', () => {
    it('returns correct number of points', () => {
      const pts = generateLimiterCurve(-0.3, 0, 'transparent', -48, 6, 100);
      expect(pts).toHaveLength(101);
    });

    it('output never exceeds ceiling', () => {
      const ceiling = -0.3;
      const pts = generateLimiterCurve(ceiling, 12, 'aggressive');
      for (const p of pts) {
        expect(p.y).toBeLessThanOrEqual(ceiling + 0.01);
      }
    });

    it('below threshold, output equals input + gain', () => {
      const pts = generateLimiterCurve(0, 0, 'transparent', -48, 6, 200);
      // Well below ceiling, output should track input
      const lowPt = pts.find((p) => p.x === -48);
      expect(lowPt).toBeDefined();
      expect(lowPt!.y).toBeCloseTo(-48, 0);
    });

    it('gain shifts the transfer curve', () => {
      const noGain = generateLimiterCurve(-0.3, 0, 'transparent');
      const withGain = generateLimiterCurve(-0.3, 6, 'transparent');
      // At a low input level, gained output should be higher
      const idx = 10;
      expect(withGain[idx].y).toBeGreaterThan(noGain[idx].y);
    });

    it('warm and aggressive styles produce different curves', () => {
      const warm = generateLimiterCurve(-1, 6, 'warm');
      const aggressive = generateLimiterCurve(-1, 6, 'aggressive');

      // Both should have the same number of points
      expect(warm).toHaveLength(aggressive.length);

      // They should differ in the knee/limiting region
      let hasDifference = false;
      for (let i = 0; i < warm.length; i++) {
        if (Math.abs(warm[i].y - aggressive[i].y) > 0.01) {
          hasDifference = true;
          break;
        }
      }
      expect(hasDifference).toBe(true);
    });

    it('all styles limit to ceiling', () => {
      for (const style of ['transparent', 'aggressive', 'warm'] as const) {
        const pts = generateLimiterCurve(-0.5, 12, style);
        const lastPt = pts[pts.length - 1];
        expect(lastPt.y).toBeLessThanOrEqual(-0.5 + 0.01);
      }
    });

    it('output never exceeds input + gain (no expansion)', () => {
      for (const style of ['transparent', 'aggressive', 'warm'] as const) {
        const gain = 6;
        const pts = generateLimiterCurve(-0.3, gain, style);
        for (const p of pts) {
          expect(p.y).toBeLessThanOrEqual(p.x + gain + 0.01);
        }
      }
    });
  });
});
