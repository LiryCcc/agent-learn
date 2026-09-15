import { z } from 'zod';

export const observabilityLogLevelSchema = z.enum(['debug', 'error', 'info', 'warn']);

export const observabilityLogEntrySchema = z.object({
  conversationId: z.string().min(1).optional(),
  details: z.string(),
  event: z.string().min(1),
  id: z.string().min(1),
  level: observabilityLogLevelSchema,
  messageId: z.string().min(1).optional(),
  scope: z.string().min(1),
  timestamp: z.iso.datetime(),
  traceId: z.string().min(1),
  traceSequence: z.number().int().positive().optional()
});

export const observabilityLogEntriesSchema = z.array(observabilityLogEntrySchema);

export type ObservabilityLogEntry = z.infer<typeof observabilityLogEntrySchema>;
export type ObservabilityLogLevel = z.infer<typeof observabilityLogLevelSchema>;

export type RecordObservabilityEventInput = {
  conversationId?: string;
  details?: unknown;
  event: string;
  level?: ObservabilityLogLevel;
  messageId?: string;
  scope: string;
  timestamp?: string;
  traceId: string;
  traceSequence?: number;
};
