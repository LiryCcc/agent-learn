import { AIMessage } from '@langchain/core/messages';
import { createMiddleware } from 'langchain';

const getFallbackToolName = (toolNames: string[]) => {
  const uniqueToolNames = [...new Set(toolNames.filter((toolName) => toolName.length > 0))];

  return uniqueToolNames.length === 1 ? uniqueToolNames[0] : undefined;
};

const hasToolName = (toolName: string) => {
  return typeof toolName === 'string' && toolName.trim().length > 0;
};

const hasToolCallId = (toolCallId: string | undefined): toolCallId is string => {
  return typeof toolCallId === 'string' && toolCallId.trim().length > 0;
};

const createToolCallId = () => {
  return `call_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const normalizeToolCalls = (message: AIMessage, toolNames: string[]) => {
  const toolCalls = message.tool_calls ?? [];

  if (toolCalls.every((toolCall) => hasToolName(toolCall.name) && hasToolCallId(toolCall.id))) {
    return message;
  }

  const requiresFallbackToolName = toolCalls.some((toolCall) => !hasToolName(toolCall.name));
  const fallbackToolName = requiresFallbackToolName ? getFallbackToolName(toolNames) : undefined;

  if (requiresFallbackToolName && !fallbackToolName) {
    throw new Error('The model returned a tool call without a function name.');
  }

  message.tool_calls = toolCalls.map((toolCall) => ({
    ...toolCall,
    id: hasToolCallId(toolCall.id) ? toolCall.id : createToolCallId(),
    name: hasToolName(toolCall.name) ? toolCall.name : (fallbackToolName ?? toolCall.name)
  }));

  return message;
};

export const toolCallCompatibilityMiddleware = createMiddleware({
  name: 'tool-call-compatibility',
  wrapModelCall: async (request, handler) => {
    const toolNames = request.tools.flatMap((tool) => (typeof tool.name === 'string' ? [tool.name] : []));

    request.messages.forEach((message) => {
      if (AIMessage.isInstance(message)) {
        normalizeToolCalls(message, toolNames);
      }
    });

    return normalizeToolCalls(await handler(request), toolNames);
  }
});
