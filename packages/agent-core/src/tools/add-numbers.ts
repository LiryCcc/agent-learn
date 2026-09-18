import { tool } from 'langchain';
import { z } from 'zod';

export const addNumbers = tool(({ first, second }) => first + second, {
  name: 'add_numbers',
  description: 'Add two numbers and return the result.',
  schema: z.object({
    first: z.number().describe('The first number.'),
    second: z.number().describe('The second number.')
  })
});
