import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';
import {
  type AgentLogLevel,
  type AgentToolCallRecord,
  type BrowserAgentInvokeOptions,
  type BrowserAgentMessage,
  type BrowserAgentResult
} from './agent-events.js';
import { createAgentTraceId, emitAgentEvent, getAgentErrorDetails } from './agent-observability.js';
import { browserAgentConfigSchema, type BrowserAgentConfig } from './browser-agent-config.js';
import { formatAgentValue } from './format-agent-value.js';
import { createSystemPrompt } from './prompts/system-prompt.js';
import { toolCallCompatibilityMiddleware } from './tool-call-compatibility.js';
import { agentTools } from './tools/agent-tools.js';

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
    tools: agentTools,
    systemPrompt: createSystemPrompt(config.model)
  });

  const invoke = async (inputMessages: BrowserAgentMessage[], options: BrowserAgentInvokeOptions = {}) => {
    const traceId = options.traceId ?? createAgentTraceId();
    const startedAt = Date.now();
    let traceSequence = 0;
    const emit = (event: string, details: Record<string, unknown> = {}, level: AgentLogLevel = 'info') => {
      traceSequence += 1;
      emitAgentEvent({
        details,
        event,
        level,
        ...(options.onLog ? { onLog: options.onLog } : {}),
        traceId,
        traceSequence
      });
    };
    const execute = async () => {
      emit('agent.invoke.started', {
        baseUrl: config.baseUrl,
        deepThinking: config.deepThinking,
        inputMessageCount: inputMessages.length,
        model: config.model,
        toolNames: agentTools.map((agentTool) => agentTool.name)
      });

      const messages = inputMessages
        .map((message) => ({ ...message, content: message.content.trim() }))
        .filter((message) => message.content.length > 0);

      if (messages.length === 0 || messages[messages.length - 1]?.role !== 'user') {
        emit(
          'agent.input.rejected',
          {
            inputMessageCount: inputMessages.length,
            normalizedMessageCount: messages.length,
            reason: 'missing-final-user-message'
          },
          'warn'
        );
        throw new Error('At least one user message is required.');
      }

      emit(
        'agent.stream.connecting',
        {
          normalizedMessageCount: messages.length,
          roles: messages.map((message) => message.role)
        },
        'debug'
      );
      const run = options.signal
        ? await agent.streamEvents({ messages }, { version: 'v3', signal: options.signal })
        : await agent.streamEvents({ messages }, { version: 'v3' });
      const toolCalls: AgentToolCallRecord[] = [];
      const reasoningParts: string[] = [];
      let messageSequence = 0;
      let streamedContent = '';

      emit('agent.stream.connected', {}, 'debug');

      const consumeMessages = async () => {
        for await (const message of run.messages) {
          messageSequence += 1;
          let currentReasoning = '';
          let reasoningUpdateCount = 0;
          let textUpdateCount = 0;

          emit('agent.message.started', { messageSequence }, 'debug');

          const consumeText = async () => {
            for await (const content of message.text.full) {
              textUpdateCount += 1;
              streamedContent = content;
              options.onText?.(content);
              emit(
                'agent.text.updated',
                {
                  contentLength: content.length,
                  messageSequence,
                  textUpdateCount
                },
                'debug'
              );
            }
          };

          const consumeReasoning = async () => {
            for await (const reasoning of message.reasoning.full) {
              reasoningUpdateCount += 1;
              currentReasoning = reasoning;
              options.onReasoning?.([...reasoningParts, reasoning].join('\n\n'));
              emit(
                'agent.reasoning.updated',
                {
                  messageSequence,
                  reasoningLength: reasoning.length,
                  reasoningUpdateCount
                },
                'debug'
              );
            }
          };

          await Promise.all([consumeText(), consumeReasoning()]);

          if (currentReasoning) {
            reasoningParts.push(currentReasoning);
          }

          emit(
            'agent.message.completed',
            {
              contentLength: streamedContent.length,
              messageSequence,
              reasoningLength: currentReasoning.length,
              reasoningUpdateCount,
              textUpdateCount
            },
            'debug'
          );
        }
      };

      const consumeToolCalls = async () => {
        for await (const toolCall of run.toolCalls) {
          const toolCallStartedAt = Date.now();
          const runningToolCall: AgentToolCallRecord = {
            id: toolCall.callId,
            input: formatAgentValue(toolCall.input),
            name: toolCall.name,
            status: 'running'
          };

          toolCalls.push(runningToolCall);
          options.onToolCall?.(runningToolCall);
          emit('agent.tool-call.started', {
            input: runningToolCall.input,
            name: runningToolCall.name,
            toolCallId: runningToolCall.id
          });

          const status = await toolCall.status;
          const output = status === 'finished' ? await toolCall.output : undefined;
          const completedToolCall: AgentToolCallRecord = {
            ...runningToolCall,
            status,
            ...(output === undefined ? {} : { output: formatAgentValue(output) }),
            ...(status === 'error' ? { error: (await toolCall.error) ?? 'Tool call failed.' } : {})
          };
          const toolCallIndex = toolCalls.findIndex((record) => record.id === completedToolCall.id);

          toolCalls[toolCallIndex] = completedToolCall;
          options.onToolCall?.(completedToolCall);
          emit(
            'agent.tool-call.completed',
            {
              durationMs: Date.now() - toolCallStartedAt,
              ...(completedToolCall.error ? { error: completedToolCall.error } : {}),
              name: completedToolCall.name,
              ...(completedToolCall.output ? { output: completedToolCall.output } : {}),
              status: completedToolCall.status,
              toolCallId: completedToolCall.id
            },
            status === 'error' ? 'error' : 'info'
          );
        }
      };

      const [result] = await Promise.all([run.output, consumeMessages(), consumeToolCalls()]);
      const finalMessage = result.messages[result.messages.length - 1];

      if (!finalMessage) {
        throw new Error('The agent returned no response.');
      }

      const resultContent = finalMessage.text || streamedContent;
      const resultReasoning = reasoningParts.join('\n\n');

      emit('agent.invoke.completed', {
        durationMs: Date.now() - startedAt,
        outputLength: resultContent.length,
        reasoningLength: resultReasoning.length,
        toolCallCount: toolCalls.length
      });

      return {
        content: resultContent,
        toolCalls,
        ...(resultReasoning ? { reasoning: resultReasoning } : {})
      };
    };

    try {
      return await execute();
    } catch (error) {
      emit(
        'agent.invoke.failed',
        {
          aborted: options.signal?.aborted ?? false,
          durationMs: Date.now() - startedAt,
          error: getAgentErrorDetails(error)
        },
        options.signal?.aborted ? 'warn' : 'error'
      );
      throw error;
    }
  };

  return { invoke };
};
