import { createMutation } from '@tanstack/solid-query';
import { useLiveQuery } from '@tanstack/solid-db';
import { Link } from '@tanstack/solid-router';
import { useSelector } from '@tanstack/solid-store';
import { Show, createSignal } from 'solid-js';
import { sendAgentMessage, type SendAgentMessageInput, type SendAgentMessageResult } from '@/api/agent.js';
import ChatComposer from '@/components/chat-composer/index.jsx';
import MessageList from '@/components/message-list/index.jsx';
import {
  appendChatMessage,
  chatStore,
  clearChatMessages,
  removeChatMessagesAfter,
  removeChatMessagesFrom,
  updateChatMessage,
  upsertChatToolCall,
  type ChatMessage
} from '@/utils/chat-store.js';
import { providerSettingsCollection } from '@/utils/provider-settings.js';
import styles from './index.module.css';

type AgentMutationInput = SendAgentMessageInput & {
  assistantMessageId: string;
};

const toConversationMessages = (messages: ChatMessage[]) => {
  return messages
    .filter((message) => message.content.length > 0 && message.status === 'complete')
    .map((message) => ({ content: message.content, role: message.role }));
};

const AgentPage = () => {
  const [prompt, setPrompt] = createSignal('');
  const [activeController, setActiveController] = createSignal<AbortController>();
  const messages = useSelector(chatStore, (state) => state.messages);
  const settingsQuery = useLiveQuery((query) => query.from({ settings: providerSettingsCollection }));
  const sendMessage = createMutation<SendAgentMessageResult, Error, AgentMutationInput>(() => ({
    mutationFn: ({ assistantMessageId: _assistantMessageId, ...input }) => sendAgentMessage(input),
    onSuccess: (result, input) => {
      updateChatMessage(input.assistantMessageId, {
        content: result.content,
        status: 'complete',
        toolCalls: result.toolCalls
      });
    },
    onError: (error, input) => {
      updateChatMessage(
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
    conversationMessages: ReturnType<typeof toConversationMessages>,
    assistantMessageId: string
  ) => {
    const provider = settings();

    if (!provider || !provider.apiKey || sendMessage.isPending) {
      return;
    }

    const controller = new AbortController();

    setActiveController(controller);
    sendMessage.mutate({
      assistantMessageId,
      messages: conversationMessages,
      onText: (content) => updateChatMessage(assistantMessageId, { content }),
      onToolCall: (toolCall) => upsertChatToolCall(assistantMessageId, toolCall),
      provider,
      signal: controller.signal
    });
  };

  const appendAssistantPlaceholder = () => {
    return appendChatMessage({
      content: '',
      role: 'assistant',
      status: 'streaming',
      toolCalls: []
    });
  };

  const handleSend = () => {
    const content = prompt().trim();

    if (!content || !isConfigured() || sendMessage.isPending) {
      return;
    }

    const conversationMessages = [...toConversationMessages(messages()), { content, role: 'user' as const }];

    appendChatMessage({ content, role: 'user', status: 'complete' });
    const assistantMessage = appendAssistantPlaceholder();

    setPrompt('');
    runAssistant(conversationMessages, assistantMessage.id);
  };

  const handleStop = () => {
    activeController()?.abort();
  };

  const handleCopy = (content: string) => {
    void navigator.clipboard.writeText(content).catch(() => undefined);
  };

  const handleSave = (messageId: string, content: string) => {
    updateChatMessage(messageId, { content });
  };

  const handleResend = (messageId: string, content: string) => {
    const messageIndex = messages().findIndex((message) => message.id === messageId);

    if (messageIndex === -1 || sendMessage.isPending) {
      return;
    }

    const conversationMessages = [
      ...toConversationMessages(messages().slice(0, messageIndex)),
      { content, role: 'user' as const }
    ];

    updateChatMessage(messageId, { content });
    removeChatMessagesAfter(messageId);
    const assistantMessage = appendAssistantPlaceholder();

    runAssistant(conversationMessages, assistantMessage.id);
  };

  const handleDelete = (messageId: string) => {
    if (!sendMessage.isPending) {
      removeChatMessagesFrom(messageId);
    }
  };

  const handleRegenerate = (messageId: string) => {
    const messageIndex = messages().findIndex((message) => message.id === messageId);

    if (messageIndex === -1 || sendMessage.isPending) {
      return;
    }

    const conversationMessages = toConversationMessages(messages().slice(0, messageIndex));

    if (conversationMessages[conversationMessages.length - 1]?.role !== 'user') {
      return;
    }

    removeChatMessagesFrom(messageId);
    const assistantMessage = appendAssistantPlaceholder();

    runAssistant(conversationMessages, assistantMessage.id);
  };

  return (
    <main class={styles['page']}>
      <section class={styles['hero']}>
        <div>
          <p class={styles['eyebrow']}>{'LANGGRAPH · BROWSER RUNTIME'}</p>
          <h1>{'Agent 对话'}</h1>
        </div>
        <p>{'支持流式回复、上下文对话和可展开的工具调用记录。'}</p>
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
          <div class={styles['toolbar']}>
            <div class={styles['model-summary']}>
              <span class={styles['status-dot']} />
              <strong>{settings()?.model}</strong>
              <small>{settings()?.baseUrl}</small>
            </div>
            <button
              class={styles['text-button']}
              disabled={sendMessage.isPending || messages().length === 0}
              onClick={clearChatMessages}
              type='button'
            >
              {'清空对话'}
            </button>
          </div>

          <MessageList
            messages={messages()}
            onCopy={handleCopy}
            onDelete={handleDelete}
            onRegenerate={handleRegenerate}
            onResend={handleResend}
            onSave={handleSave}
            onStop={handleStop}
            pending={sendMessage.isPending}
          />

          <div class={styles['composer-shell']}>
            <ChatComposer
              disabled={!isConfigured()}
              onChange={setPrompt}
              onSend={handleSend}
              onStop={handleStop}
              pending={sendMessage.isPending}
              value={prompt()}
            />
          </div>
        </section>
      </Show>
    </main>
  );
};

export default AgentPage;
