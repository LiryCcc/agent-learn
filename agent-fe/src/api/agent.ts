import {
  createBrowserAgent,
  type AgentToolCallRecord,
  type BrowserAgentConfig,
  type BrowserAgentMessage,
  type BrowserAgentResult
} from '@liry-a/agent-core';

export type SendAgentMessageInput = {
  messages: BrowserAgentMessage[];
  provider: BrowserAgentConfig;
  signal?: AbortSignal;
  onText?: (content: string) => void;
  onToolCall?: (toolCall: AgentToolCallRecord) => void;
};

export type SendAgentMessageResult = BrowserAgentResult;

export const sendAgentMessage = async ({ messages, provider, signal, onText, onToolCall }: SendAgentMessageInput) => {
  const agent = createBrowserAgent(provider);
  return agent.invoke(messages, {
    ...(signal ? { signal } : {}),
    ...(onText ? { onText } : {}),
    ...(onToolCall ? { onToolCall } : {})
  });
};
