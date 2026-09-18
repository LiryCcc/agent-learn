import type { ObservabilityLogEntry } from './observability-types.js';

export type ObservabilityExportFormat = 'jsonl' | 'text';

export type ObservabilityExportContent = {
  build: {
    branch: string;
    builtAt: string;
    commit: string;
    mode: string;
  };
  exportedAt: string;
  logs: ObservabilityLogEntry[];
};

const schemaVersion = 1;

const parseDetails = (details: string) => {
  try {
    return JSON.parse(details) as unknown;
  } catch {
    return details;
  }
};

const hasDetails = (details: unknown) => {
  if (details === null || details === undefined) {
    return false;
  }

  if (typeof details === 'object' && !Array.isArray(details)) {
    return Object.keys(details).length > 0;
  }

  return true;
};

const formatLogIdentity = (entry: ObservabilityLogEntry) => {
  const fields = [
    `trace=${entry.traceId}`,
    `seq=${entry.traceSequence === undefined ? '-' : String(entry.traceSequence)}`,
    `id=${entry.id}`
  ];

  if (entry.conversationId) {
    fields.push(`conversation=${entry.conversationId}`);
  }

  if (entry.messageId) {
    fields.push(`message=${entry.messageId}`);
  }

  return fields.join(' ');
};

export const formatObservabilityLogsAsJsonl = ({ build, exportedAt, logs }: ObservabilityExportContent) => {
  const records = [
    {
      build,
      exportedAt,
      recordType: 'header',
      schemaVersion
    },
    ...logs.map((entry) => ({
      ...entry,
      details: parseDetails(entry.details),
      recordType: 'log'
    }))
  ];

  return `${records.map((record) => JSON.stringify(record)).join('\n')}\n`;
};

export const formatObservabilityLogsAsText = ({ build, exportedAt, logs }: ObservabilityExportContent) => {
  const header = [
    '# Liry Agent observability logs',
    `# exportedAt: ${exportedAt}`,
    `# schemaVersion: ${String(schemaVersion)}`,
    `# build.branch: ${build.branch}`,
    `# build.builtAt: ${build.builtAt}`,
    `# build.commit: ${build.commit}`,
    `# build.mode: ${build.mode}`
  ];
  const body = logs.map((entry) => {
    const firstLine = `${entry.timestamp} ${entry.level.toUpperCase().padEnd(5, ' ')} ${entry.scope} ${entry.event} ${formatLogIdentity(entry)}`;
    const parsedDetails = parseDetails(entry.details);

    if (!hasDetails(parsedDetails)) {
      return firstLine;
    }

    return `${firstLine}\n  details: ${JSON.stringify(parsedDetails)}`;
  });

  return `${[...header, '', ...body].join('\n')}\n`;
};
