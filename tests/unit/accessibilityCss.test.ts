import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readSrc(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

describe('Accessibility CSS fixes', () => {
  describe('#548 — focus-visible indicators', () => {
    it('index.css contains focus-visible outline rules', () => {
      const css = readSrc('src/index.css');
      expect(css).toContain('focus-visible');
      expect(css).toContain('outline: 2px solid');
      expect(css).toContain('outline-offset');
    });
  });

  describe('#556 — webkit scrollbar styling', () => {
    it('index.css contains ::-webkit-scrollbar rules', () => {
      const css = readSrc('src/index.css');
      expect(css).toContain('::-webkit-scrollbar');
      expect(css).toContain('::-webkit-scrollbar-track');
      expect(css).toContain('::-webkit-scrollbar-thumb');
    });
  });

  describe('#550 — color contrast WCAG AA', () => {
    const contrastFiles = [
      'src/components/ui/Knob.tsx',
      'src/components/layout/StatusBar.tsx',
    ];

    for (const file of contrastFiles) {
      it(`${file} does not use text-zinc-500 on dark backgrounds`, () => {
        const content = readSrc(file);
        expect(content).not.toContain('text-zinc-500');
      });
    }

    it('Knob.tsx label uses at least text-[10px] (not text-[9px])', () => {
      const content = readSrc('src/components/ui/Knob.tsx');
      expect(content).not.toContain('text-[9px]');
    });
  });
});
