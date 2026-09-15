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
  onReasoning?: (reasoning: string) => void;
  onText?: (content: string) => void;
  onToolCall?: (toolCall: AgentToolCallRecord) => void;
};

export type SendAgentMessageResult = BrowserAgentResult;

export const sendAgentMessage = async ({
  messages,
  provider,
  signal,
  onReasoning,
  onText,
  onToolCall
}: SendAgentMessageInput) => {
  const agent = createBrowserAgent(provider);
  return agent.invoke(messages, {
    ...(signal ? { signal } : {}),
    ...(onReasoning ? { onReasoning } : {}),
    ...(onText ? { onText } : {}),
    ...(onToolCall ? { onToolCall } : {})
  });
};
