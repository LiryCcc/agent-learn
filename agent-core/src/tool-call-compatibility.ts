import { AIMessage } from '@langchain/core/messages';
import { createMiddleware } from 'langchain';
import {
  getLatestHumanMessageText,
  getToolChoiceName,
  hasToolCallId,
  hasToolName,
  resolveToolCallName
} from './tool-call-name-resolver.js';

const createToolCallId = () => {
  return `call_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const isToolCallArgs = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const parseInvalidToolCallArgs = (args: string | undefined) => {
  if (!args) {
    return undefined;
  }

  try {
    const parsedArgs: unknown = JSON.parse(args);

    return isToolCallArgs(parsedArgs) ? parsedArgs : undefined;
  } catch {
    return undefined;
  }
};

const recoverInvalidToolCalls = (
  message: AIMessage,
  toolNames: string[],
  contextText: string,
  toolChoiceName: string | undefined
) => {
  const recoveredToolCallIndexes = new Set<number>();
  const recoveredToolCalls = (message.invalid_tool_calls ?? []).flatMap((invalidToolCall, toolCallIndex) => {
    const args = parseInvalidToolCallArgs(invalidToolCall.args);

    if (!args) {
      return [];
    }

    const resolvedToolName = resolveToolCallName(
      message,
      invalidToolCall.name,
      invalidToolCall.id,
      toolCallIndex,
      args,
      toolNames,
      contextText,
      toolChoiceName
    );

    if (!resolvedToolName) {
      return [];
    }

    recoveredToolCallIndexes.add(toolCallIndex);

    return [
      {
        args,
        id: hasToolCallId(invalidToolCall.id) ? invalidToolCall.id : createToolCallId(),
        name: resolvedToolName
      }
    ];
  });

  if (recoveredToolCalls.length > 0) {
    message.tool_calls = [...(message.tool_calls ?? []), ...recoveredToolCalls];
    message.invalid_tool_calls = (message.invalid_tool_calls ?? []).filter(
      (_invalidToolCall, toolCallIndex) => !recoveredToolCallIndexes.has(toolCallIndex)
    );
  }
};

export const normalizeToolCalls = (
  message: AIMessage,
  toolNames: string[],
  contextText = '',
  toolChoiceName?: string
) => {
  recoverInvalidToolCalls(message, toolNames, contextText, toolChoiceName);

  const toolCalls = message.tool_calls ?? [];

  if (toolCalls.every((toolCall) => hasToolName(toolCall.name) && hasToolCallId(toolCall.id))) {
    return message;
  }

  message.tool_calls = toolCalls.map((toolCall, toolCallIndex) => {
    const resolvedToolName = resolveToolCallName(
      message,
      toolCall.name,
      toolCall.id,
      toolCallIndex,
      toolCall.args,
      toolNames,
      contextText,
      toolChoiceName
    );

    if (!resolvedToolName) {
      throw new Error('The model returned a tool call without a function name, and no unique tool could be inferred.');
    }

    return {
      ...toolCall,
      id: hasToolCallId(toolCall.id) ? toolCall.id : createToolCallId(),
      name: resolvedToolName
    };
  });

  return message;
};

export const toolCallCompatibilityMiddleware = createMiddleware({
  name: 'tool-call-compatibility',
  wrapModelCall: async (request, handler) => {
    const toolNames = request.tools.flatMap((tool) => (typeof tool.name === 'string' ? [tool.name] : []));
    const contextText = getLatestHumanMessageText(request.messages);
    const toolChoiceName = getToolChoiceName(request.toolChoice, toolNames);

    request.messages.forEach((message) => {
      if (AIMessage.isInstance(message)) {
        normalizeToolCalls(message, toolNames, contextText, toolChoiceName);
      }
    });

    return normalizeToolCalls(await handler(request), toolNames, contextText, toolChoiceName);
  }
});
