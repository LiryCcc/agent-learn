import { buildInfo } from './build-info.js';
import {
  observabilityLogEntriesSchema,
  type ObservabilityLogEntry,
  type RecordObservabilityEventInput
} from './observability-types.js';

const logStorageKey = 'liry-agent-observability-logs';
const maximumLogEntries = 1_000;
const persistDelayMs = 250;
const sensitiveKeyPattern = /api[-_]?key|authorization|cookie|credential|password|secret|token/i;
let pendingEntries: ObservabilityLogEntry[] = [];
let persistTimer: number | undefined;

const createId = (prefix: string) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      ...(error.stack ? { stack: error.stack } : {})
    };
  }

  return { message: String(error) };
};

const sanitizeValue = (value: unknown, seenValues: WeakSet<object>): unknown => {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'function' || typeof value === 'symbol') {
    return String(value);
  }

  if (!value || typeof value !== 'object') {
    return value ?? null;
  }

  if (value instanceof Error) {
    return getErrorDetails(value);
  }

  if (seenValues.has(value)) {
    return '[Circular]';
  }

  seenValues.add(value);

  if (Array.isArray(value)) {
    const sanitizedArray = value.map((item) => sanitizeValue(item, seenValues));

    seenValues.delete(value);
    return sanitizedArray;
  }

  const sanitizedObject = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitiveKeyPattern.test(key) ? '[REDACTED]' : sanitizeValue(item, seenValues)
    ])
  );

  seenValues.delete(value);
  return sanitizedObject;
};

const serializeDetails = (details: unknown) => {
  try {
    return JSON.stringify(sanitizeValue(details, new WeakSet())) ?? '{}';
  } catch (error) {
    return JSON.stringify({ serializationError: getErrorDetails(error) });
  }
};

const printEntry = (entry: ObservabilityLogEntry) => {
  const serializedEntry = JSON.stringify(entry);

  if (entry.level === 'error') {
    console.error(serializedEntry);
  } else if (entry.level === 'warn') {
    console.warn(serializedEntry);
  } else if (entry.level === 'debug') {
    console.debug(serializedEntry);
  } else {
    console.info(serializedEntry);
  }
};

const readStoredEntries = () => {
  try {
    const storedValue = window.localStorage.getItem(logStorageKey);

    if (!storedValue) {
      return [];
    }

    const result = observabilityLogEntriesSchema.safeParse(JSON.parse(storedValue));

    if (result.success) {
      return result.data;
    }

    console.warn(
      JSON.stringify({
        event: 'observability.storage.invalid',
        issues: result.error.issues.map((issue) => issue.message),
        timestamp: new Date().toISOString()
      })
    );
  } catch (error) {
    console.warn(
      JSON.stringify({
        details: getErrorDetails(error),
        event: 'observability.storage.read-failed',
        timestamp: new Date().toISOString()
      })
    );
  }

  return [];
};

export const flushObservabilityLogs = () => {
  if (persistTimer !== undefined) {
    window.clearTimeout(persistTimer);
    persistTimer = undefined;
  }

  if (pendingEntries.length === 0) {
    return;
  }

  const entriesToPersist = [...readStoredEntries(), ...pendingEntries].slice(-maximumLogEntries);

  try {
    window.localStorage.setItem(logStorageKey, JSON.stringify(entriesToPersist));
    pendingEntries = [];
  } catch (error) {
    pendingEntries = pendingEntries.slice(-maximumLogEntries);
    console.error(
      JSON.stringify({
        details: getErrorDetails(error),
        event: 'observability.storage.write-failed',
        timestamp: new Date().toISOString()
      })
    );
  }
};

const schedulePersistence = () => {
  if (persistTimer !== undefined) {
    return;
  }

  persistTimer = window.setTimeout(flushObservabilityLogs, persistDelayMs);
};

export const createObservabilityTraceId = (scope: string) => {
  return createId(scope);
};

export const recordObservabilityEvent = (input: RecordObservabilityEventInput, options: { print?: boolean } = {}) => {
  const entry: ObservabilityLogEntry = {
    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
    details: serializeDetails(input.details ?? {}),
    event: input.event,
    id: createId('log'),
    level: input.level ?? 'info',
    ...(input.messageId ? { messageId: input.messageId } : {}),
    scope: input.scope,
    timestamp: input.timestamp ?? new Date().toISOString(),
    traceId: input.traceId,
    ...(input.traceSequence ? { traceSequence: input.traceSequence } : {})
  };

  pendingEntries.push(entry);

  if (options.print !== false) {
    printEntry(entry);
  }

  schedulePersistence();
  return entry;
};

const parseDetails = (details: string): unknown => {
  try {
    return JSON.parse(details);
  } catch {
    return details;
  }
};

export const readObservabilityLogs = () => {
  return [...readStoredEntries(), ...pendingEntries].slice(-maximumLogEntries);
};

export const exportObservabilityLogs = () => {
  const traceId = createObservabilityTraceId('export');

  recordObservabilityEvent({
    details: { format: 'json' },
    event: 'observability.export.requested',
    scope: 'observability',
    traceId
  });
  flushObservabilityLogs();

  const logs = readObservabilityLogs();
  const exportedAt = new Date().toISOString();
  const exportPayload = {
    build: buildInfo,
    exportedAt,
    logs: logs.map((entry) => ({
      ...entry,
      details: parseDetails(entry.details)
    })),
    schemaVersion: 1
  };
  const fileName = `liry-agent-logs-${exportedAt.replace(/:/g, '-')}.json`;
  const fileUrl = URL.createObjectURL(new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' }));
  const downloadLink = document.createElement('a');

  downloadLink.download = fileName;
  downloadLink.href = fileUrl;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(() => URL.revokeObjectURL(fileUrl), 0);

  return { entryCount: logs.length, fileName };
};

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushObservabilityLogs);
}
