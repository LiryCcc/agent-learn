export type AgentToolCallStatus = 'error' | 'finished' | 'running';

export type AgentToolCallRecord = {
  id: string;
  input: string;
  name: string;
  status: AgentToolCallStatus;
  error?: string;
  output?: string;
};

export type BrowserAgentMessage = {
  content: string;
  role: 'assistant' | 'user';
};

export type BrowserAgentResult = {
  content: string;
  toolCalls: AgentToolCallRecord[];
  reasoning?: string;
};

export type BrowserAgentInvokeOptions = {
  signal?: AbortSignal;
  onReasoning?: (reasoning: string) => void;
  onText?: (content: string) => void;
  onToolCall?: (toolCall: AgentToolCallRecord) => void;
};
