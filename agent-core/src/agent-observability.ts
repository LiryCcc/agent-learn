import type { AgentLogLevel, AgentObservabilityEvent } from './agent-events.js';

type EmitAgentEventInput = {
  details?: Record<string, unknown>;
  event: string;
  level?: AgentLogLevel;
  onLog?: (event: AgentObservabilityEvent) => void;
  traceId: string;
  traceSequence: number;
};

export const createAgentTraceId = () => {
  return `agent-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const getAgentErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      ...(error.stack ? { stack: error.stack } : {})
    };
  }

  return { message: String(error) };
};

export const emitAgentEvent = ({
  details = {},
  event,
  level = 'info',
  onLog,
  traceId,
  traceSequence
}: EmitAgentEventInput) => {
  const observabilityEvent: AgentObservabilityEvent = {
    details,
    event,
    level,
    scope: 'agent-core',
    timestamp: new Date().toISOString(),
    traceId,
    traceSequence
  };
  const serializedEvent = JSON.stringify(observabilityEvent);

  if (level === 'error') {
    console.error(serializedEvent);
  } else if (level === 'warn') {
    console.warn(serializedEvent);
  } else if (level === 'debug') {
    console.debug(serializedEvent);
  } else {
    console.info(serializedEvent);
  }

  try {
    onLog?.(observabilityEvent);
  } catch (error) {
    console.error(
      JSON.stringify({
        details: getAgentErrorDetails(error),
        event: 'observability.callback.failed',
        level: 'error',
        scope: 'agent-core',
        timestamp: new Date().toISOString(),
        traceId,
        traceSequence
      })
    );
  }
};
