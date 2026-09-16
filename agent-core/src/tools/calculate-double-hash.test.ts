import { describe, expect, it } from 'vitest';
import { calculateDoubleHash } from './calculate-double-hash.js';

describe('double-hash operator', () => {
  it('evaluates left ## right as left * 3 + right * 2', async () => {
    await expect(calculateDoubleHash.invoke({ left: 4, right: 5 })).resolves.toBe(22);
  });

  it('exposes a provider-compatible tool name', () => {
    expect(calculateDoubleHash.name).toBe('calculate_double_hash');
  });

  it('keeps the calculation rule out of the model-visible description', () => {
    expect(calculateDoubleHash.description).toBe(
      'Evaluate the custom binary operator ## for two operands. Its implementation is private to this tool.'
    );
  });
});
