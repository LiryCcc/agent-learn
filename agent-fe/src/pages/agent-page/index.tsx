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
  recoverInterruptedConversation,
  removeConversationMessagesAfter,
  removeConversationMessagesFrom,
  setConversationDeepThinking,
  updateConversationMessage,
  upsertConversationToolCall
} from '@/utils/conversation-collection.js';
import { conversationStore, selectConversation } from '@/utils/conversation-store.js';
import { isolateFullscreenElement } from '@/utils/fullscreen-isolation.js';
import { createObservabilityTraceId, recordObservabilityEvent } from '@/utils/observability-log.js';
import { providerSettingsCollection } from '@/utils/provider-settings.js';
import { useLiveQuery } from '@tanstack/solid-db';
import { createMutation } from '@tanstack/solid-query';
import { Link } from '@tanstack/solid-router';
import { useSelector } from '@tanstack/solid-store';
import { Show, createEffect, createSignal, onCleanup } from 'solid-js';
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
  const [prompt, setPrompt] = createSignal('');
  const [activeController, setActiveController] = createSignal<AbortController>();
  const [activeTraceId, setActiveTraceId] = createSignal<string>();
  const [isFullscreen, setIsFullscreen] = createSignal(false);
  const activeConversationId = useSelector(conversationStore, (state) => state.activeConversationId);
  const conversationsQuery = useLiveQuery((query) => query.from({ conversations: conversationCollection }));
  const settingsQuery = useLiveQuery((query) => query.from({ settings: providerSettingsCollection }));
  let chatCardElement: HTMLElement | undefined;
  let recoveredInterruptedConversations = false;

  const conversations = () => sortConversations(conversationsQuery());
  const activeConversation = () => {
    return conversationsQuery().find((conversation) => conversation.id === activeConversationId());
  };
  const chatCardClass = () =>
    [styles['chat-card'], isFullscreen() ? styles['chat-card-fullscreen'] : undefined].filter(Boolean).join(' ');
  const messages = () => activeConversation()?.messages ?? [];

  createEffect(() => {
    if (!conversationsQuery.isReady) {
      return;
    }

    const availableConversations = conversations();

    if (!recoveredInterruptedConversations) {
      recoveredInterruptedConversations = true;
      availableConversations.forEach((conversation) => recoverInterruptedConversation(conversation.id));
      recordObservabilityEvent({
        details: { conversationCount: availableConversations.length },
        event: 'conversation.interrupted-runs.recovered',
        scope: 'conversation',
        traceId: createObservabilityTraceId('conversation')
      });
    }

    if (availableConversations.some((conversation) => conversation.id === activeConversationId())) {
      return;
    }

    const nextConversation = availableConversations[0] ?? createConversation();

    selectConversation(nextConversation.id);

    if (availableConversations.length === 0) {
      recordObservabilityEvent({
        conversationId: nextConversation.id,
        details: { source: 'initialization' },
        event: 'conversation.created',
        scope: 'conversation',
        traceId: createObservabilityTraceId('conversation')
      });
    }
  });

  const sendMessage = createMutation<SendAgentMessageResult, Error, AgentMutationInput>(() => ({
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
  }));

  const settings = () => settingsQuery()[0];
  const isConfigured = () => Boolean(settings()?.apiKey);

  const runAssistant = (
    conversation: ChatConversation,
    conversationMessages: ReturnType<typeof toConversationMessages>,
    assistantMessageId: string,
    trigger: 'regenerate' | 'resend' | 'send',
    requestedTraceId?: string
  ) => {
    const providerSettings = settings();

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
        trigger
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
      onReasoning: (reasoning) => updateConversationMessage(conversation.id, assistantMessageId, { reasoning }),
      onText: (content) => updateConversationMessage(conversation.id, assistantMessageId, { content }),
      onToolCall: (toolCall) => upsertConversationToolCall(conversation.id, assistantMessageId, toolCall),
      provider: {
        ...providerSettings,
        deepThinking: conversation.deepThinking
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

    const remainingConversations = conversations().filter((conversation) => conversation.id !== conversationId);
    const deletedConversation = conversationsQuery().find((conversation) => conversation.id === conversationId);

    deleteConversation(conversationId);
    recordObservabilityEvent({
      conversationId,
      details: {
        messageCount: deletedConversation?.messages.length ?? 0,
        wasActive: activeConversationId() === conversationId
      },
      event: 'conversation.deleted',
      scope: 'conversation',
      traceId: createObservabilityTraceId('conversation')
    });

    if (activeConversationId() === conversationId) {
      selectConversation(remainingConversations[0]?.id ?? null);
    }
  };

  const handleSend = () => {
    const content = prompt().trim();
    const conversation = activeConversation();

    if (!content || !conversation || !isConfigured() || sendMessage.isPending) {
      return;
    }

    const conversationMessages = [...toConversationMessages(conversation.messages), { content, role: 'user' as const }];

    appendConversationMessage(conversation.id, { content, role: 'user', status: 'complete' });
    const assistantMessage = appendAssistantPlaceholder(conversation.id);

    setPrompt('');
    runAssistant(conversation, conversationMessages, assistantMessage.id, 'send');
  };

  const handleStop = () => {
    const conversation = activeConversation();

    if (conversation) {
      recordObservabilityEvent({
        conversationId: conversation.id,
        event: 'conversation.agent.stop-requested',
        level: 'warn',
        scope: 'conversation',
        traceId: activeTraceId() ?? createObservabilityTraceId('agent')
      });
    }

    activeController()?.abort();
  };

  const handleCopy = (content: string) => {
    const conversation = activeConversation();
    const traceId = createObservabilityTraceId('clipboard');

    void navigator.clipboard
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
    const conversation = activeConversation();

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
    const conversation = activeConversation();
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
    const conversation = activeConversation();

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
    const conversation = activeConversation();
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
    const conversation = activeConversation();

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
    const conversation = activeConversation();

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
    const conversation = activeConversation();

    setIsFullscreen(enabled);
    recordObservabilityEvent({
      ...(conversation ? { conversationId: conversation.id } : {}),
      details: { enabled },
      event: 'conversation.fullscreen.changed',
      scope: 'conversation',
      traceId: createObservabilityTraceId('conversation')
    });
  };

  createEffect(() => {
    if (!isFullscreen()) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleFullscreenChange(false);
      }
    };
    const restoreFullscreenIsolation = chatCardElement ? isolateFullscreenElement(chatCardElement) : undefined;

    window.addEventListener('keydown', handleKeyDown);

    onCleanup(() => {
      window.removeEventListener('keydown', handleKeyDown);
      restoreFullscreenIsolation?.();
    });
  });

  return (
    <main class={styles['page']}>
      <section class={styles['hero']}>
        <div>
          <p class={styles['eyebrow']}>{'LANGGRAPH · BROWSER RUNTIME'}</p>
          <h1>{'Agent 对话'}</h1>
        </div>
        <p>{'多会话本地持久化，支持深度思考、流式回复和工具调用记录。'}</p>
      </section>

      <Show
        when={isConfigured()}
        fallback={
          <section class={styles['notice-card']}>
            <div>
              <strong>{'还没有模型配置'}</strong>
              <p>{'先填写 API Key、Base URL 和模型名，再回来发送消息。'}</p>
            </div>
            <Link class={styles['secondary-button']} to='/settings'>
              {'前往设置'}
            </Link>
          </section>
        }
      >
        <section class={chatCardClass()} ref={chatCardElement}>
          <Show when={!isFullscreen()}>
            <ConversationList
              activeConversationId={activeConversationId()}
              conversations={conversations()}
              disabled={sendMessage.isPending}
              onCreate={handleCreateConversation}
              onDelete={handleDeleteConversation}
              onSelect={handleSelectConversation}
            />
          </Show>

          <div class={styles['chat-workspace']}>
            <div class={styles['toolbar']}>
              <Show when={!isFullscreen()}>
                <div class={styles['model-summary']}>
                  <span class={styles['status-dot']} />
                  <strong>{settings()?.model}</strong>
                  <small>{settings()?.baseUrl}</small>
                </div>
              </Show>
              <div class={styles['toolbar-actions']}>
                <DeepThinkingToggle
                  checked={activeConversation()?.deepThinking ?? false}
                  disabled={!activeConversation() || sendMessage.isPending}
                  onChange={handleDeepThinkingChange}
                />
                <Show when={!isFullscreen()}>
                  <button
                    class={styles['text-button']}
                    disabled={sendMessage.isPending || messages().length === 0}
                    onClick={handleClearMessages}
                    type='button'
                  >
                    {'清空当前对话'}
                  </button>
                </Show>
                <ConversationFullscreenToggle active={isFullscreen()} onChange={handleFullscreenChange} />
              </div>
            </div>

            <MessageList
              messages={messages()}
              onCopy={handleCopy}
              onDelete={handleDeleteMessage}
              onRegenerate={handleRegenerate}
              onResend={handleResend}
              onSave={handleSave}
              onStop={handleStop}
              pending={sendMessage.isPending}
            />

            <div class={styles['composer-shell']}>
              <ChatComposer
                disabled={!isConfigured() || !activeConversation()}
                onChange={setPrompt}
                onSend={handleSend}
                onStop={handleStop}
                pending={sendMessage.isPending}
                value={prompt()}
              />
            </div>
          </div>
        </section>
      </Show>
    </main>
  );
};

export default AgentPage;
