import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

if (typeof globalThis.ResizeObserver === 'undefined') {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
}
