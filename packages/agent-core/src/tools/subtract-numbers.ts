import { tool } from 'langchain';
import { z } from 'zod';

export const subtractNumbers = tool(({ first, second }) => first - second, {
  name: 'subtract_numbers',
  description: 'Subtract the second number from the first number and return the result.',
  schema: z.object({
    first: z.number().describe('The number to subtract from.'),
    second: z.number().describe('The number to subtract.')
  })
});
