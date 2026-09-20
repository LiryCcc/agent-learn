import type { WebSearchConfig } from '@liry-a/web-search-core';
import { addNumbers } from './add-numbers.js';
import { calculateDoubleHash } from './calculate-double-hash.js';
import { divideNumbers } from './divide-numbers.js';
import { getCurrentDatetime } from './get-current-datetime.js';
import { multiplyNumbers } from './multiply-numbers.js';
import { subtractNumbers } from './subtract-numbers.js';
import { createWebSearchTool } from './web-search.js';

export const agentTools = [
  addNumbers,
  subtractNumbers,
  multiplyNumbers,
  divideNumbers,
  calculateDoubleHash,
  getCurrentDatetime
];

export const createAgentTools = (webSearchConfig?: WebSearchConfig) => {
  return webSearchConfig ? [...agentTools, createWebSearchTool(webSearchConfig)] : agentTools;
};
