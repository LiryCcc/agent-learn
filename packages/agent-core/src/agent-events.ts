export type AgentToolCallStatus = 'error' | 'finished' | 'running';

export type AgentLogLevel = 'debug' | 'error' | 'info' | 'warn';

export type AgentObservabilityEvent = {
  details: Record<string, unknown>;
  event: string;
  level: AgentLogLevel;
  scope: 'agent-core';
  timestamp: string;
  traceId: string;
  traceSequence: number;
};

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
  traceId?: string;
  onLog?: (event: AgentObservabilityEvent) => void;
  onReasoning?: (reasoning: string) => void;
  onText?: (content: string) => void;
  onToolCall?: (toolCall: AgentToolCallRecord) => void;
};
