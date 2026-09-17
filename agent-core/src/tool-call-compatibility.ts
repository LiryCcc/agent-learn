import { AIMessage } from '@langchain/core/messages';
import { createMiddleware } from 'langchain';

const createToolCallId = () => {
  return `call_${String(Date.now())}_${Math.random().toString(36).slice(2, 10)}`;
};

const hasToolName = (toolName: string | undefined): toolName is string => {
  return typeof toolName === 'string' && toolName.trim().length > 0;
};

const hasToolCallId = (toolCallId: string | undefined): toolCallId is string => {
  return typeof toolCallId === 'string' && toolCallId.trim().length > 0;
};

const createUniqueToolCallId = (usedToolCallIds: Set<string>) => {
  let toolCallId = createToolCallId();

  while (usedToolCallIds.has(toolCallId)) {
    toolCallId = createToolCallId();
  }

  return toolCallId;
};

export const normalizeToolCalls = (message: AIMessage, usedToolCallIds: Set<string> = new Set<string>()) => {
  const toolCalls = message.tool_calls ?? [];

  message.tool_calls = toolCalls.map((toolCall) => {
    if (!hasToolName(toolCall.name)) {
      throw new Error(
        'The model provider returned an invalid tool call without a function name. Each tool call in a complete response must include function.name.'
      );
    }

    const providedToolCallId = hasToolCallId(toolCall.id) ? toolCall.id.trim() : undefined;
    const toolCallId =
      providedToolCallId && !usedToolCallIds.has(providedToolCallId)
        ? providedToolCallId
        : createUniqueToolCallId(usedToolCallIds);

    usedToolCallIds.add(toolCallId);

    return {
      ...toolCall,
      id: toolCallId,
      name: toolCall.name.trim()
    };
  });

  return message;
};

export const toolCallCompatibilityMiddleware = createMiddleware({
  name: 'tool-call-compatibility',
  wrapModelCall: async (request, handler) => {
    const usedToolCallIds = new Set<string>();

    request.messages.forEach((message) => {
      if (AIMessage.isInstance(message)) {
        normalizeToolCalls(message, usedToolCallIds);
      }
    });

    return normalizeToolCalls(await handler(request), usedToolCallIds);
  }
});
