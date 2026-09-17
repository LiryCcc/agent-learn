import { vi } from 'vitest';

const createMediaQueryList = (query: string): MediaQueryList => {
  return {
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn()
  };
};

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: createMediaQueryList
});
