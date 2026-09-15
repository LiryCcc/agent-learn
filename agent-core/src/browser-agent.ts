import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';
import {
  type AgentToolCallRecord,
  type BrowserAgentInvokeOptions,
  type BrowserAgentMessage,
  type BrowserAgentResult
} from './agent-events.js';
import { browserAgentConfigSchema, type BrowserAgentConfig } from './browser-agent-config.js';
import { formatAgentValue } from './format-agent-value.js';
import { SYSTEM_PROMPT } from './prompts/system-prompt.js';
import { toolCallCompatibilityMiddleware } from './tool-call-compatibility.js';
import { addNumbers } from './tools/add-numbers.js';

export type BrowserAgent = {
  invoke: (messages: BrowserAgentMessage[], options?: BrowserAgentInvokeOptions) => Promise<BrowserAgentResult>;
};

export const createBrowserAgent = (inputConfig: BrowserAgentConfig): BrowserAgent => {
  const config = browserAgentConfigSchema.parse(inputConfig);
  const model = new ChatOpenAI({
    apiKey: config.apiKey,
    model: config.model,
    ...(config.deepThinking ? { reasoning: { effort: 'high' as const } } : { temperature: 0 }),
    configuration: {
      baseURL: config.baseUrl,
      dangerouslyAllowBrowser: true
    }
  });
  const agent = createAgent({
    middleware: [toolCallCompatibilityMiddleware],
    model,
    tools: [addNumbers],
    systemPrompt: SYSTEM_PROMPT
  });

  const invoke = async (inputMessages: BrowserAgentMessage[], options: BrowserAgentInvokeOptions = {}) => {
    const messages = inputMessages
      .map((message) => ({ ...message, content: message.content.trim() }))
      .filter((message) => message.content.length > 0);

    if (messages.length === 0 || messages[messages.length - 1]?.role !== 'user') {
      throw new Error('At least one user message is required.');
    }

    const run = options.signal
      ? await agent.streamEvents({ messages }, { version: 'v3', signal: options.signal })
      : await agent.streamEvents({ messages }, { version: 'v3' });
    const toolCalls: AgentToolCallRecord[] = [];
    const reasoningParts: string[] = [];
    let streamedContent = '';

    const consumeMessages = async () => {
      for await (const message of run.messages) {
        let currentReasoning = '';

        const consumeText = async () => {
          for await (const content of message.text.full) {
            streamedContent = content;
            options.onText?.(content);
          }
        };

        const consumeReasoning = async () => {
          for await (const reasoning of message.reasoning.full) {
            currentReasoning = reasoning;
            options.onReasoning?.([...reasoningParts, reasoning].join('\n\n'));
          }
        };

        await Promise.all([consumeText(), consumeReasoning()]);

        if (currentReasoning) {
          reasoningParts.push(currentReasoning);
        }
      }
    };

    const consumeToolCalls = async () => {
      for await (const toolCall of run.toolCalls) {
        const runningToolCall: AgentToolCallRecord = {
          id: toolCall.callId,
          input: formatAgentValue(toolCall.input),
          name: toolCall.name,
          status: 'running'
        };

        toolCalls.push(runningToolCall);
        options.onToolCall?.(runningToolCall);

        const status = await toolCall.status;
        const completedToolCall: AgentToolCallRecord = {
          ...runningToolCall,
          status,
          ...(status === 'finished' ? { output: formatAgentValue(await toolCall.output) } : {}),
          ...(status === 'error' ? { error: (await toolCall.error) ?? 'Tool call failed.' } : {})
        };
        const toolCallIndex = toolCalls.findIndex((record) => record.id === completedToolCall.id);

        toolCalls[toolCallIndex] = completedToolCall;
        options.onToolCall?.(completedToolCall);
      }
    };

    const [result] = await Promise.all([run.output, consumeMessages(), consumeToolCalls()]);
    const finalMessage = result.messages[result.messages.length - 1];

    if (!finalMessage) {
      throw new Error('The agent returned no response.');
    }

    return {
      content: finalMessage.text || streamedContent,
      toolCalls,
      ...(reasoningParts.length > 0 ? { reasoning: reasoningParts.join('\n\n') } : {})
    };
  };

  return { invoke };
};
