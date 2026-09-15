import { useLiveQuery } from '@tanstack/solid-db';
import { createMutation } from '@tanstack/solid-query';
import { Link } from '@tanstack/solid-router';
import { useSelector } from '@tanstack/solid-store';
import { Show, createEffect, createSignal } from 'solid-js';
import { sendAgentMessage, type SendAgentMessageInput, type SendAgentMessageResult } from '@/api/agent.js';
import ChatComposer from '@/components/chat-composer/index.jsx';
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
import { providerSettingsCollection } from '@/utils/provider-settings.js';
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
  const activeConversationId = useSelector(conversationStore, (state) => state.activeConversationId);
  const conversationsQuery = useLiveQuery((query) => query.from({ conversations: conversationCollection }));
  const settingsQuery = useLiveQuery((query) => query.from({ settings: providerSettingsCollection }));
  let recoveredInterruptedConversations = false;

  const conversations = () => sortConversations(conversationsQuery());
  const activeConversation = () => {
    return conversationsQuery().find((conversation) => conversation.id === activeConversationId());
  };
  const messages = () => activeConversation()?.messages ?? [];

  createEffect(() => {
    if (!conversationsQuery.isReady) {
      return;
    }

    const availableConversations = conversations();

    if (!recoveredInterruptedConversations) {
      recoveredInterruptedConversations = true;
      availableConversations.forEach((conversation) => recoverInterruptedConversation(conversation.id));
    }

    if (availableConversations.some((conversation) => conversation.id === activeConversationId())) {
      return;
    }

    const nextConversation = availableConversations[0] ?? createConversation();

    selectConversation(nextConversation.id);
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
    },
    onSettled: () => setActiveController(undefined)
  }));

  const settings = () => settingsQuery()[0];
  const isConfigured = () => Boolean(settings()?.apiKey);

  const runAssistant = (
    conversation: ChatConversation,
    conversationMessages: ReturnType<typeof toConversationMessages>,
    assistantMessageId: string
  ) => {
    const providerSettings = settings();

    if (!providerSettings || !providerSettings.apiKey || sendMessage.isPending) {
      return;
    }

    const controller = new AbortController();

    setActiveController(controller);
    sendMessage.mutate({
      assistantMessageId,
      conversationId: conversation.id,
      messages: conversationMessages,
      onReasoning: (reasoning) => updateConversationMessage(conversation.id, assistantMessageId, { reasoning }),
      onText: (content) => updateConversationMessage(conversation.id, assistantMessageId, { content }),
      onToolCall: (toolCall) => upsertConversationToolCall(conversation.id, assistantMessageId, toolCall),
      provider: {
        ...providerSettings,
        deepThinking: conversation.deepThinking
      },
      signal: controller.signal
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
  };

  const handleSelectConversation = (conversationId: string) => {
    if (!sendMessage.isPending) {
      selectConversation(conversationId);
      setPrompt('');
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    if (sendMessage.isPending) {
      return;
    }

    const remainingConversations = conversations().filter((conversation) => conversation.id !== conversationId);

    deleteConversation(conversationId);

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
    runAssistant(conversation, conversationMessages, assistantMessage.id);
  };

  const handleStop = () => {
    activeController()?.abort();
  };

  const handleCopy = (content: string) => {
    void navigator.clipboard.writeText(content).catch(() => undefined);
  };

  const handleSave = (messageId: string, content: string) => {
    const conversation = activeConversation();

    if (conversation) {
      updateConversationMessage(conversation.id, messageId, { content });
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

    runAssistant(conversation, conversationMessages, assistantMessage.id);
  };

  const handleDeleteMessage = (messageId: string) => {
    const conversation = activeConversation();

    if (conversation && !sendMessage.isPending) {
      removeConversationMessagesFrom(conversation.id, messageId);
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

    runAssistant(conversation, conversationMessages, assistantMessage.id);
  };

  const handleClearMessages = () => {
    const conversation = activeConversation();

    if (conversation && !sendMessage.isPending) {
      clearConversationMessages(conversation.id);
    }
  };

  const handleDeepThinkingChange = (enabled: boolean) => {
    const conversation = activeConversation();

    if (conversation && !sendMessage.isPending) {
      setConversationDeepThinking(conversation.id, enabled);
    }
  };

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
        <section class={styles['chat-card']}>
          <ConversationList
            activeConversationId={activeConversationId()}
            conversations={conversations()}
            disabled={sendMessage.isPending}
            onCreate={handleCreateConversation}
            onDelete={handleDeleteConversation}
            onSelect={handleSelectConversation}
          />

          <div class={styles['chat-workspace']}>
            <div class={styles['toolbar']}>
              <div class={styles['model-summary']}>
                <span class={styles['status-dot']} />
                <strong>{settings()?.model}</strong>
                <small>{settings()?.baseUrl}</small>
              </div>
              <div class={styles['toolbar-actions']}>
                <DeepThinkingToggle
                  checked={activeConversation()?.deepThinking ?? false}
                  disabled={!activeConversation() || sendMessage.isPending}
                  onChange={handleDeepThinkingChange}
                />
                <button
                  class={styles['text-button']}
                  disabled={sendMessage.isPending || messages().length === 0}
                  onClick={handleClearMessages}
                  type='button'
                >
                  {'清空当前对话'}
                </button>
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
