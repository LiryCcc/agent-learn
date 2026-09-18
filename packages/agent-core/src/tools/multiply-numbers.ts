import { tool } from 'langchain';
import { z } from 'zod';

export const multiplyNumbers = tool(({ first, second }) => first * second, {
  name: 'multiply_numbers',
  description: 'Multiply two numbers and return the result.',
  schema: z.object({
    first: z.number().describe('The first factor.'),
    second: z.number().describe('The second factor.')
  })
});
