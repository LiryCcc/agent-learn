import { createBrowserAgent, type BrowserAgentConfig } from '@liry-a/agent-core';

export type SendAgentMessageInput = {
  message: string;
  provider: BrowserAgentConfig;
};

export const sendAgentMessage = async ({ message, provider }: SendAgentMessageInput) => {
  const agent = createBrowserAgent(provider);
  return agent.invoke(message);
};
