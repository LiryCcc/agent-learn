import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('system prompt', () => {
  it('keeps the double-hash calculation rule private from the model', () => {
    const prompt = readFileSync(new URL('./system-prompt.md', import.meta.url), 'utf8');

    expect(prompt).toContain('custom binary operator `##`');
    expect(prompt).toContain('calculation rule is intentionally hidden');
    expect(prompt).not.toContain('a * 3');
    expect(prompt).not.toContain('b * 2');
  });
});
