import { describe, expect, it } from 'vitest';
import { resolveColorTheme } from './color-theme.js';

describe('color theme', () => {
  it('prefers a persisted theme over the system preference', () => {
    expect(resolveColorTheme('light', true)).toBe('light');
    expect(resolveColorTheme('dark', false)).toBe('dark');
  });

  it('falls back to the system preference when no valid theme is stored', () => {
    expect(resolveColorTheme(null, true)).toBe('dark');
    expect(resolveColorTheme('unsupported', false)).toBe('light');
  });
});
