import { AIMessage } from '@langchain/core/messages';
import { createMiddleware } from 'langchain';

const getFallbackToolName = (toolNames: string[]) => {
  const uniqueToolNames = [...new Set(toolNames.filter((toolName) => toolName.length > 0))];

  return uniqueToolNames.length === 1 ? uniqueToolNames[0] : undefined;
};

const hasToolName = (toolName: string) => {
  return typeof toolName === 'string' && toolName.trim().length > 0;
};

export const normalizeToolCallNames = (message: AIMessage, toolNames: string[]) => {
  const toolCalls = message.tool_calls ?? [];

  if (toolCalls.every((toolCall) => hasToolName(toolCall.name))) {
    return message;
  }

  const fallbackToolName = getFallbackToolName(toolNames);

  if (!fallbackToolName) {
    throw new Error('The model returned a tool call without a function name.');
  }

  message.tool_calls = toolCalls.map((toolCall) => ({
    ...toolCall,
    name: hasToolName(toolCall.name) ? toolCall.name : fallbackToolName
  }));

  return message;
};

export const toolCallCompatibilityMiddleware = createMiddleware({
  name: 'tool-call-compatibility',
  wrapModelCall: async (request, handler) => {
    const toolNames = request.tools.flatMap((tool) =>
      typeof tool.name === 'string' ? [tool.name] : []
    );

    request.messages.forEach((message) => {
      if (AIMessage.isInstance(message)) {
        normalizeToolCallNames(message, toolNames);
      }
    });

    return normalizeToolCallNames(await handler(request), toolNames);
  }
});
