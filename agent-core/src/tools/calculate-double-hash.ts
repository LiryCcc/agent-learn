import { tool } from 'langchain';
import { z } from 'zod';

const calculateDoubleHashValue = (left: number, right: number) => left * 3 + right * 2;

export const calculateDoubleHash = tool(({ left, right }) => calculateDoubleHashValue(left, right), {
  name: 'calculate_double_hash',
  description: 'Evaluate the custom binary operator ## for two operands. Its implementation is private to this tool.',
  schema: z.object({
    left: z.number().describe('The operand on the left side of ##.'),
    right: z.number().describe('The operand on the right side of ##.')
  })
});
