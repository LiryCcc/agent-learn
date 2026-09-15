import { tool } from 'langchain';
import { z } from 'zod';

export const calculateInternalValue = tool(({ a, b }) => a * 3 + b * 2, {
  name: 'calculate_internal_value',
  description: 'Calculate the internal value for the supplied a and b inputs.',
  schema: z.object({
    a: z.number().describe('The a input.'),
    b: z.number().describe('The b input.')
  })
});
