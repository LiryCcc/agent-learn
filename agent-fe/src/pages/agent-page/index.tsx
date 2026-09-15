import { createMutation } from '@tanstack/solid-query';
import { useLiveQuery } from '@tanstack/solid-db';
import { Link } from '@tanstack/solid-router';
import { useSelector } from '@tanstack/solid-store';
import { For, Show, createSignal } from 'solid-js';
import { sendAgentMessage, type SendAgentMessageInput } from '@/api/agent.js';
import ChatMessage from '@/components/chat-message/index.jsx';
import { appendChatMessage, chatStore, clearChatMessages } from '@/utils/chat-store.js';
import { providerSettingsCollection } from '@/utils/provider-settings.js';
import styles from './index.module.css';

const AgentPage = () => {
  const [prompt, setPrompt] = createSignal('');
  const messages = useSelector(chatStore, (state) => state.messages);
  const settingsQuery = useLiveQuery((query) => query.from({ settings: providerSettingsCollection }));
  const sendMessage = createMutation<string, Error, SendAgentMessageInput>(() => ({
    mutationFn: sendAgentMessage,
    onSuccess: (response) => {
      appendChatMessage('assistant', response);
    }
  }));

  const settings = () => settingsQuery()[0];
  const isConfigured = () => Boolean(settings()?.apiKey);

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    const message = prompt().trim();
    const provider = settings();

    if (!message || !provider || !isConfigured()) {
      return;
    }

    appendChatMessage('user', message);
    setPrompt('');
    sendMessage.mutate({ message, provider });
  };

  return (
    <main class={styles['page']}>
      <section class={styles['hero']}>
        <p class={styles['eyebrow']}>{'LANGGRAPH · BROWSER RUNTIME'}</p>
        <h1>{'最简单的本地 Agent'}</h1>
        <p>
          {'Agent 由 '}
          <code class={styles['code']}>{'@liry-a/agent-core'}</code>
          {' 提供，在浏览器中直接调用你配置的模型。'}
        </p>
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
            <button class={styles['text-button']} type='button' onClick={clearChatMessages}>
              {'清空对话'}
            </button>
          </div>

          <div class={styles['message-list']} aria-live='polite'>
            <Show
              when={messages().length > 0}
              fallback={
                <div class={styles['empty-state']}>
                  <span>{'✦'}</span>
                  <p>{'可以试试：“123 加 456 等于多少？”'}</p>
                </div>
              }
            >
              <For each={messages()}>{(message) => <ChatMessage message={message} />}</For>
            </Show>
            <Show when={sendMessage.isPending}>
              <article class={styles['pending-message']}>
                <span>{'Agent'}</span>
                <p>{'正在思考…'}</p>
              </article>
            </Show>
          </div>

          <Show when={sendMessage.isError}>
            <p class={styles['error']}>{sendMessage.error?.message}</p>
          </Show>

          <form class={styles['prompt-form']} onSubmit={handleSubmit}>
            <textarea
              aria-label='发送给 Agent 的消息'
              disabled={sendMessage.isPending}
              onInput={(event) => setPrompt(event.currentTarget.value)}
              placeholder='输入你的问题…'
              rows='3'
              value={prompt()}
            />
            <button class={styles['primary-button']} disabled={sendMessage.isPending || !prompt().trim()} type='submit'>
              {sendMessage.isPending ? '发送中' : '发送'}
            </button>
          </form>
        </section>
      </Show>
    </main>
  );
};

export default AgentPage;
