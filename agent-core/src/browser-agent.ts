import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';
import { browserAgentConfigSchema, type BrowserAgentConfig } from './browser-agent-config.js';
import { SYSTEM_PROMPT } from './prompts/system-prompt.js';
import { addNumbers } from './tools/add-numbers.js';

export type BrowserAgent = {
  invoke: (input: string) => Promise<string>;
};

export const createBrowserAgent = (inputConfig: BrowserAgentConfig): BrowserAgent => {
  const config = browserAgentConfigSchema.parse(inputConfig);
  const model = new ChatOpenAI({
    apiKey: config.apiKey,
    model: config.model,
    temperature: 0,
    configuration: {
      baseURL: config.baseUrl,
      dangerouslyAllowBrowser: true
    }
  });
  const agent = createAgent({
    model,
    tools: [addNumbers],
    systemPrompt: SYSTEM_PROMPT
  });

  const invoke = async (input: string) => {
    const message = input.trim();

    if (!message) {
      throw new Error('Message is required.');
    }

    const result = await agent.invoke({
      messages: [{ role: 'user', content: message }]
    });
    const finalMessage = result.messages[result.messages.length - 1];

    if (!finalMessage) {
      throw new Error('The agent returned no response.');
    }

    return finalMessage.text;
  };

  return { invoke };
};
