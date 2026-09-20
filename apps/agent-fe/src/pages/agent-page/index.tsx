import { sendAgentMessage, type SendAgentMessageInput, type SendAgentMessageResult } from '@/api/agent.js';
import ChatComposer from '@/components/chat-composer/index.jsx';
import ConversationFullscreenToggle from '@/components/conversation-fullscreen-toggle/index.jsx';
import ConversationList from '@/components/conversation-list/index.jsx';
import DeepThinkingToggle from '@/components/deep-thinking-toggle/index.jsx';
import MessageList from '@/components/message-list/index.jsx';
import type { ChatConversation, ChatMessage } from '@/utils/chat-types.js';
import {
  appendConversationMessage,
  clearConversationMessages,
  conversationCollection,
  createConversation,
  deleteConversation,
  removeConversationMessagesAfter,
  removeConversationMessagesFrom,
  setConversationDeepThinking,
  updateConversationMessage,
  upsertConversationToolCall
} from '@/utils/conversation-collection.js';
import { selectConversation } from '@/utils/conversation-store.js';
import { isolateFullscreenElement } from '@/utils/fullscreen-isolation.js';
import { createObservabilityTraceId, recordObservabilityEvent } from '@/utils/observability-log.js';
import { providerSettingsCollection } from '@/utils/provider-settings.js';
import { useAppSelector } from '@/utils/store.js';
import { useLiveQuery } from '@tanstack/react-db';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useCallback, useRef, useState } from 'react';
import styles from './index.module.css';

type AgentMutationInput = SendAgentMessageInput & {
  assistantMessageId: string;
  conversationId: string;
};

const toConversationMessages = (messages: ChatMessage[]) => {
  return messages
    .filter((message) => message.content.length > 0 && message.status === 'complete')
    .map((message) => ({ content: message.content, role: message.role }));
};

const sortConversations = (conversations: ChatConversation[]) => {
  return [...conversations].sort((left, right) => right.updatedAt - left.updatedAt);
};

const AgentPage = () => {
  const [prompt, setPrompt] = useState('');
  const [activeController, setActiveController] = useState<AbortController>();
  const [activeTraceId, setActiveTraceId] = useState<string>();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const activeConversationId = useAppSelector((state) => state.conversation.activeConversationId);
  const conversationsQuery = useLiveQuery((query) => query.from({ conversations: conversationCollection }));
  const settingsQuery = useLiveQuery((query) => query.from({ settings: providerSettingsCollection }));
  const fullscreenSession = useRef<{
    element: HTMLElement | null;
    restore: (() => void) | undefined;
  }>({
    element: null,
    restore: undefined
  });
  const attachChatCard = useCallback((element: HTMLElement | null) => {
    fullscreenSession.current.element = element;

    if (element) {
      return;
    }

    fullscreenSession.current.restore?.();
    fullscreenSession.current.restore = undefined;
  }, []);

  const conversations = sortConversations(conversationsQuery.data);
  const activeConversation = conversationsQuery.data.find((conversation) => conversation.id === activeConversationId);
  const chatCardClass = [styles['chat-card'], isFullscreen ? styles['chat-card-fullscreen'] : undefined]
    .filter(Boolean)
    .join(' ');
  const messages = activeConversation?.messages ?? [];

  const sendMessage = useMutation<SendAgentMessageResult, Error, AgentMutationInput>({
    mutationFn: ({ assistantMessageId: _assistantMessageId, conversationId: _conversationId, ...input }) =>
      sendAgentMessage(input),
    onSuccess: (result, input) => {
      updateConversationMessage(input.conversationId, input.assistantMessageId, {
        content: result.content,
        status: 'complete',
        toolCalls: result.toolCalls,
        ...(result.reasoning ? { reasoning: result.reasoning } : {})
      });
      recordObservabilityEvent({
        conversationId: input.conversationId,
        details: {
          contentLength: result.content.length,
          reasoningLength: result.reasoning?.length ?? 0,
          toolCallCount: result.toolCalls.length
        },
        event: 'conversation.response.persisted',
        messageId: input.assistantMessageId,
        scope: 'conversation',
        traceId: input.traceId ?? createObservabilityTraceId('agent')
      });
    },
    onError: (error, input) => {
      updateConversationMessage(
        input.conversationId,
        input.assistantMessageId,
        input.signal?.aborted
          ? { status: 'stopped' }
          : {
              error: error.message,
              status: 'failed'
            }
      );
      recordObservabilityEvent({
        conversationId: input.conversationId,
        details: {
          aborted: input.signal?.aborted ?? false,
          error
        },
        event: 'conversation.response.failed',
        level: input.signal?.aborted ? 'warn' : 'error',
        messageId: input.assistantMessageId,
        scope: 'conversation',
        traceId: input.traceId ?? createObservabilityTraceId('agent')
      });
    },
    onSettled: () => {
      setActiveController(undefined);
      setActiveTraceId(undefined);
    }
  });

  const settings = settingsQuery.data[0];
  const isConfigured = Boolean(settings?.apiKey);

  const runAssistant = (
    conversation: ChatConversation,
    conversationMessages: ReturnType<typeof toConversationMessages>,
    assistantMessageId: string,
    trigger: 'regenerate' | 'resend' | 'send',
    requestedTraceId?: string
  ) => {
    const providerSettings = settingsQuery.data[0];

    if (!providerSettings || !providerSettings.apiKey || sendMessage.isPending) {
      return;
    }

    const controller = new AbortController();
    const traceId = requestedTraceId ?? createObservabilityTraceId('agent');

    setActiveController(controller);
    setActiveTraceId(traceId);
    recordObservabilityEvent({
      conversationId: conversation.id,
      details: {
        deepThinking: conversation.deepThinking,
        messageCount: conversationMessages.length,
        model: providerSettings.model,
        trigger,
        webSearchEnabled: providerSettings.webSearchEnabled,
        ...(providerSettings.webSearchEnabled ? { webSearchProvider: providerSettings.webSearchProvider } : {})
      },
      event: 'conversation.agent.dispatched',
      messageId: assistantMessageId,
      scope: 'conversation',
      traceId
    });
    sendMessage.mutate({
      assistantMessageId,
      conversationId: conversation.id,
      messages: conversationMessages,
      onLog: (event) =>
        recordObservabilityEvent(
          {
            conversationId: conversation.id,
            details: event.details,
            event: event.event,
            level: event.level,
            messageId: assistantMessageId,
            scope: event.scope,
            timestamp: event.timestamp,
            traceId: event.traceId,
            traceSequence: event.traceSequence
          },
          { print: false }
        ),
      onReasoning: (reasoning) => {
        updateConversationMessage(conversation.id, assistantMessageId, { reasoning });
      },
      onText: (content) => {
        updateConversationMessage(conversation.id, assistantMessageId, { content });
      },
      onToolCall: (toolCall) => {
        upsertConversationToolCall(conversation.id, assistantMessageId, toolCall);
      },
      provider: {
        apiKey: providerSettings.apiKey,
        baseUrl: providerSettings.baseUrl,
        deepThinking: conversation.deepThinking,
        model: providerSettings.model,
        streamingEnabled: providerSettings.streamingEnabled,
        webSearch: providerSettings.webSearchEnabled
          ? {
              apiKey: providerSettings.webSearchApiKey,
              enabled: true,
              provider: providerSettings.webSearchProvider
            }
          : { enabled: false }
      },
      signal: controller.signal,
      traceId
    });
  };

  const appendAssistantPlaceholder = (conversationId: string) => {
    return appendConversationMessage(conversationId, {
      content: '',
      role: 'assistant',
      status: 'streaming',
      toolCalls: []
    });
  };

  const handleCreateConversation = () => {
    if (sendMessage.isPending) {
      return;
    }

    const conversation = createConversation();

    selectConversation(conversation.id);
    setPrompt('');
    recordObservabilityEvent({
      conversationId: conversation.id,
      details: { source: 'user' },
      event: 'conversation.created',
      scope: 'conversation',
      traceId: createObservabilityTraceId('conversation')
    });
  };

  const handleSelectConversation = (conversationId: string) => {
    if (!sendMessage.isPending) {
      selectConversation(conversationId);
      setPrompt('');
      recordObservabilityEvent({
        conversationId,
        event: 'conversation.selected',
        scope: 'conversation',
        traceId: createObservabilityTraceId('conversation')
      });
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    if (sendMessage.isPending) {
      return;
    }

    const remainingConversations = conversations.filter((conversation) => conversation.id !== conversationId);
    const deletedConversation = conversationsQuery.data.find((conversation) => conversation.id === conversationId);

    deleteConversation(conversationId);
    recordObservabilityEvent({
      conversationId,
      details: {
        messageCount: deletedConversation?.messages.length ?? 0,
        wasActive: activeConversationId === conversationId
      },
      event: 'conversation.deleted',
      scope: 'conversation',
      traceId: createObservabilityTraceId('conversation')
    });

    if (activeConversationId === conversationId) {
      const nextConversation = remainingConversations[0] ?? createConversation();

      selectConversation(nextConversation.id);

      if (!remainingConversations[0]) {
        recordObservabilityEvent({
          conversationId: nextConversation.id,
          details: { source: 'initialization' },
          event: 'conversation.created',
          scope: 'conversation',
          traceId: createObservabilityTraceId('conversation')
        });
      }
    }
  };

  const handleSend = () => {
    const content = prompt.trim();
    const conversation = activeConversation;

    if (!content || !conversation || !isConfigured || sendMessage.isPending) {
      return;
    }

    const conversationMessages = [...toConversationMessages(conversation.messages), { content, role: 'user' as const }];

    appendConversationMessage(conversation.id, { content, role: 'user', status: 'complete' });
    const assistantMessage = appendAssistantPlaceholder(conversation.id);

    setPrompt('');
    runAssistant(conversation, conversationMessages, assistantMessage.id, 'send');
  };

  const handleStop = () => {
    const conversation = activeConversation;

    if (conversation) {
      recordObservabilityEvent({
        conversationId: conversation.id,
        event: 'conversation.agent.stop-requested',
        level: 'warn',
        scope: 'conversation',
        traceId: activeTraceId ?? createObservabilityTraceId('agent')
      });
    }

    activeController?.abort();
  };

  const handleCopy = (content: string) => {
    const conversation = activeConversation;
    const traceId = createObservabilityTraceId('clipboard');

    navigator.clipboard
      .writeText(content)
      .then(() =>
        recordObservabilityEvent({
          ...(conversation ? { conversationId: conversation.id } : {}),
          details: { contentLength: content.length },
          event: 'conversation.message.copied',
          scope: 'conversation',
          traceId
        })
      )
      .catch((error: unknown) =>
        recordObservabilityEvent({
          ...(conversation ? { conversationId: conversation.id } : {}),
          details: { error },
          event: 'conversation.message.copy-failed',
          level: 'error',
          scope: 'conversation',
          traceId
        })
      );
  };

  const handleSave = (messageId: string, content: string) => {
    const conversation = activeConversation;

    if (conversation) {
      updateConversationMessage(conversation.id, messageId, { content });
      recordObservabilityEvent({
        conversationId: conversation.id,
        details: { contentLength: content.length },
        event: 'conversation.message.edited',
        messageId,
        scope: 'conversation',
        traceId: createObservabilityTraceId('conversation')
      });
    }
  };

  const handleResend = (messageId: string, content: string) => {
    const conversation = activeConversation;
    const messageIndex = conversation?.messages.findIndex((message) => message.id === messageId) ?? -1;

    if (!conversation || messageIndex === -1 || sendMessage.isPending) {
      return;
    }

    const conversationMessages = [
      ...toConversationMessages(conversation.messages.slice(0, messageIndex)),
      { content, role: 'user' as const }
    ];

    updateConversationMessage(conversation.id, messageId, { content });
    removeConversationMessagesAfter(conversation.id, messageId);
    const assistantMessage = appendAssistantPlaceholder(conversation.id);
    const traceId = createObservabilityTraceId('agent');

    recordObservabilityEvent({
      conversationId: conversation.id,
      details: { contentLength: content.length },
      event: 'conversation.message.resent',
      messageId,
      scope: 'conversation',
      traceId
    });
    runAssistant(conversation, conversationMessages, assistantMessage.id, 'resend', traceId);
  };

  const handleDeleteMessage = (messageId: string) => {
    const conversation = activeConversation;

    if (conversation && !sendMessage.isPending) {
      removeConversationMessagesFrom(conversation.id, messageId);
      recordObservabilityEvent({
        conversationId: conversation.id,
        event: 'conversation.messages.deleted-from',
        messageId,
        scope: 'conversation',
        traceId: createObservabilityTraceId('conversation')
      });
    }
  };

  const handleRegenerate = (messageId: string) => {
    const conversation = activeConversation;
    const messageIndex = conversation?.messages.findIndex((message) => message.id === messageId) ?? -1;

    if (!conversation || messageIndex === -1 || sendMessage.isPending) {
      return;
    }

    const conversationMessages = toConversationMessages(conversation.messages.slice(0, messageIndex));

    if (conversationMessages[conversationMessages.length - 1]?.role !== 'user') {
      return;
    }

    removeConversationMessagesFrom(conversation.id, messageId);
    const assistantMessage = appendAssistantPlaceholder(conversation.id);
    const traceId = createObservabilityTraceId('agent');

    recordObservabilityEvent({
      conversationId: conversation.id,
      event: 'conversation.response.regenerated',
      messageId,
      scope: 'conversation',
      traceId
    });
    runAssistant(conversation, conversationMessages, assistantMessage.id, 'regenerate', traceId);
  };

  const handleClearMessages = () => {
    const conversation = activeConversation;

    if (conversation && !sendMessage.isPending) {
      const messageCount = conversation.messages.length;

      clearConversationMessages(conversation.id);
      recordObservabilityEvent({
        conversationId: conversation.id,
        details: { messageCount },
        event: 'conversation.messages.cleared',
        scope: 'conversation',
        traceId: createObservabilityTraceId('conversation')
      });
    }
  };

  const handleDeepThinkingChange = (enabled: boolean) => {
    const conversation = activeConversation;

    if (conversation && !sendMessage.isPending) {
      setConversationDeepThinking(conversation.id, enabled);
      recordObservabilityEvent({
        conversationId: conversation.id,
        details: { enabled },
        event: 'conversation.deep-thinking.changed',
        scope: 'conversation',
        traceId: createObservabilityTraceId('conversation')
      });
    }
  };

  const handleFullscreenChange = (enabled: boolean) => {
    const conversation = activeConversation;

    fullscreenSession.current.restore?.();
    fullscreenSession.current.restore = undefined;
    setIsFullscreen(enabled);
    recordObservabilityEvent({
      ...(conversation ? { conversationId: conversation.id } : {}),
      details: { enabled },
      event: 'conversation.fullscreen.changed',
      scope: 'conversation',
      traceId: createObservabilityTraceId('conversation')
    });

    if (!enabled) {
      return;
    }

    const element = fullscreenSession.current.element;

    if (!element) {
      return;
    }

    const restoreIsolation = isolateFullscreenElement(element);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleFullscreenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    fullscreenSession.current.restore = () => {
      window.removeEventListener('keydown', handleKeyDown);
      restoreIsolation();
    };
  };

  return (
    <main className={styles['page']}>
      <section className={styles['hero']}>
        <div>
          <p className={styles['eyebrow']}>{'LANGGRAPH · BROWSER RUNTIME'}</p>
          <h1>{'Agent 对话'}</h1>
        </div>
        <p>{'多会话本地持久化，支持深度思考、流式回复和工具调用记录。'}</p>
      </section>

      {isConfigured ? (
        <section className={chatCardClass} ref={attachChatCard}>
          {isFullscreen ? null : (
            <ConversationList
              activeConversationId={activeConversationId}
              conversations={conversations}
              disabled={sendMessage.isPending}
              onCreate={handleCreateConversation}
              onDelete={handleDeleteConversation}
              onSelect={handleSelectConversation}
            />
          )}

          <div className={styles['chat-workspace']}>
            <div className={styles['toolbar']}>
              {isFullscreen ? null : (
                <div className={styles['model-summary']}>
                  <span className={styles['status-dot']} />
                  <strong>{settings?.model}</strong>
                  <small>{settings?.baseUrl}</small>
                </div>
              )}
              <div className={styles['toolbar-actions']}>
                <DeepThinkingToggle
                  checked={activeConversation?.deepThinking ?? false}
                  disabled={!activeConversation || sendMessage.isPending}
                  onChange={handleDeepThinkingChange}
                />
                {isFullscreen ? null : (
                  <button
                    className={styles['text-button']}
                    disabled={sendMessage.isPending || messages.length === 0}
                    onClick={handleClearMessages}
                    type='button'
                  >
                    {'清空当前对话'}
                  </button>
                )}
                <ConversationFullscreenToggle active={isFullscreen} onChange={handleFullscreenChange} />
              </div>
            </div>

            <MessageList
              messages={messages}
              onCopy={handleCopy}
              onDelete={handleDeleteMessage}
              onRegenerate={handleRegenerate}
              onResend={handleResend}
              onSave={handleSave}
              onStop={handleStop}
              pending={sendMessage.isPending}
            />

            <div className={styles['composer-shell']}>
              <ChatComposer
                disabled={!activeConversation}
                onChange={setPrompt}
                onSend={handleSend}
                onStop={handleStop}
                pending={sendMessage.isPending}
                value={prompt}
              />
            </div>
          </div>
        </section>
      ) : (
        <section className={styles['notice-card']}>
          <div>
            <strong>{'还没有模型配置'}</strong>
            <p>{'先填写 API Key、Base URL 和模型名，再回来发送消息。'}</p>
          </div>
          <Link className={styles['secondary-button']} to='/settings'>
            {'前往设置'}
          </Link>
        </section>
      )}
    </main>
  );
};

export default AgentPage;
