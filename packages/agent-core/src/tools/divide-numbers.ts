import { tool } from 'langchain';
import { z } from 'zod';

export const divideNumbers = tool(
  ({ first, second }) => {
    if (second === 0) {
      throw new Error('Cannot divide by zero.');
    }

    return first / second;
  },
  {
    name: 'divide_numbers',
    description: 'Divide the first number by the second number and return the result.',
    schema: z.object({
      first: z.number().describe('The dividend.'),
      second: z.number().describe('The non-zero divisor.')
    })
  }
);
