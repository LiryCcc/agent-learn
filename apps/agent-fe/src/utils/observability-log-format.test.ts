import { describe, expect, it } from 'vitest';
import { formatObservabilityLogsAsJsonl, formatObservabilityLogsAsText } from './observability-log-format.js';
import type { ObservabilityLogEntry } from './observability-types.js';

const sampleBuild = {
  branch: 'main',
  builtAt: '2026-09-18T12:00:00.000Z',
  commit: 'abc123def456',
  mode: 'test'
};

const sampleLogs: ObservabilityLogEntry[] = [
  {
    details: JSON.stringify({ format: 'jsonl' }),
    event: 'observability.export.requested',
    id: 'log-1',
    level: 'info',
    scope: 'observability',
    timestamp: '2026-09-18T14:25:01.123Z',
    traceId: 'export-1',
    traceSequence: 1
  },
  {
    conversationId: 'conversation-1',
    details: '{}',
    event: 'agent.tool.completed',
    id: 'log-2',
    level: 'error',
    messageId: 'msg-1',
    scope: 'agent',
    timestamp: '2026-09-18T14:25:02.000Z',
    traceId: 'agent-1'
  },
  {
    details: JSON.stringify({ apiKey: '[REDACTED]', ok: true }),
    event: 'provider.request.failed',
    id: 'log-3',
    level: 'warn',
    scope: 'api',
    timestamp: '2026-09-18T14:25:03.000Z',
    traceId: 'api-1',
    traceSequence: 2
  }
];

describe('observability log format', () => {
  it('serializes a header record and one json object per log line', () => {
    const text = formatObservabilityLogsAsJsonl({
      build: sampleBuild,
      exportedAt: '2026-09-18T14:30:00.000Z',
      logs: sampleLogs
    });
    const lines = text.trimEnd().split('\n');
    const records = lines.map((line) => JSON.parse(line) as Record<string, unknown>);

    expect(text.endsWith('\n')).toBe(true);
    expect(records).toHaveLength(4);
    expect(records[0]).toMatchObject({
      build: sampleBuild,
      exportedAt: '2026-09-18T14:30:00.000Z',
      recordType: 'header',
      schemaVersion: 1
    });
    expect(records[1]).toMatchObject({
      details: { format: 'jsonl' },
      event: 'observability.export.requested',
      id: 'log-1',
      recordType: 'log',
      traceId: 'export-1',
      traceSequence: 1
    });
    expect(records[2]).toMatchObject({
      conversationId: 'conversation-1',
      details: {},
      messageId: 'msg-1',
      recordType: 'log'
    });
    expect(JSON.stringify(records[1]?.['details'] ?? null)).not.toContain('undefined');
  });

  it('renders a grep-friendly text log with build metadata', () => {
    const text = formatObservabilityLogsAsText({
      build: sampleBuild,
      exportedAt: '2026-09-18T14:30:00.000Z',
      logs: sampleLogs
    });

    expect(text.startsWith('# Liry Agent observability logs\n')).toBe(true);
    expect(text).toContain('# exportedAt: 2026-09-18T14:30:00.000Z');
    expect(text).toContain('# schemaVersion: 1');
    expect(text).toContain('# build.commit: abc123def456');
    expect(text).toContain(
      '2026-09-18T14:25:01.123Z INFO  observability observability.export.requested trace=export-1 seq=1 id=log-1'
    );
    expect(text).toContain('  details: {"format":"jsonl"}');
    expect(text).toContain(
      '2026-09-18T14:25:02.000Z ERROR agent agent.tool.completed trace=agent-1 seq=- id=log-2 conversation=conversation-1 message=msg-1'
    );
    expect(text).not.toContain('details: {}');
    expect(text).toContain('  details: {"apiKey":"[REDACTED]","ok":true}');
    expect(text).not.toContain('undefined');
    expect(text.endsWith('\n')).toBe(true);
  });
});
