import { z } from 'zod';

export const chatToolCallStatusSchema = z.enum(['error', 'finished', 'running']);
export const chatMessageStatusSchema = z.enum(['complete', 'failed', 'stopped', 'streaming']);
export const chatRoleSchema = z.enum(['assistant', 'user']);

export const chatToolCallSchema = z.object({
  id: z.string(),
  input: z.string(),
  name: z.string(),
  status: chatToolCallStatusSchema,
  error: z.string().optional(),
  output: z.string().optional()
});

export const chatMessageSchema = z.object({
  id: z.string(),
  role: chatRoleSchema,
  content: z.string(),
  status: chatMessageStatusSchema,
  error: z.string().optional(),
  reasoning: z.string().optional(),
  toolCalls: z.array(chatToolCallSchema).optional()
});

export const chatConversationSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deepThinking: z.boolean(),
  messages: z.array(chatMessageSchema)
});

export type ChatToolCallStatus = z.infer<typeof chatToolCallStatusSchema>;
export type ChatMessageStatus = z.infer<typeof chatMessageStatusSchema>;
export type ChatRole = z.infer<typeof chatRoleSchema>;
export type ChatToolCall = z.infer<typeof chatToolCallSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatConversation = z.infer<typeof chatConversationSchema>;
export type NewChatMessage = Omit<ChatMessage, 'id'>;
