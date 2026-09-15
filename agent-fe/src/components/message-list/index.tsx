import { Index, Show, createEffect } from 'solid-js';
import ChatMessage from '@/components/chat-message/index.jsx';
import type { ChatMessage as ChatMessageValue } from '@/utils/chat-store.js';
import styles from './index.module.css';

type MessageListProps = {
  messages: ChatMessageValue[];
  pending: boolean;
  onCopy: (content: string) => void;
  onDelete: (messageId: string) => void;
  onRegenerate: (messageId: string) => void;
  onResend: (messageId: string, content: string) => void;
  onSave: (messageId: string, content: string) => void;
  onStop: () => void;
};

const MessageList = (props: MessageListProps) => {
  let listElement: HTMLDivElement | undefined;

  createEffect(() => {
    const contentSnapshot = props.messages
      .map((message) => {
        const toolCallSnapshot = message.toolCalls
          ?.map((toolCall) => `${toolCall.id}:${toolCall.status}:${toolCall.output ?? ''}`)
          .join(',');

        return `${message.content}:${message.status}:${toolCallSnapshot ?? ''}`;
      })
      .join('|');

    if (contentSnapshot && listElement) {
      queueMicrotask(() => listElement?.scrollTo({ behavior: 'smooth', top: listElement.scrollHeight }));
    }
  });

  return (
    <div class={styles['message-list']} aria-live='polite' ref={listElement}>
      <Show
        when={props.messages.length > 0}
        fallback={
          <div class={styles['empty-state']}>
            <span>{'✦'}</span>
            <strong>{'开始一段新对话'}</strong>
            <p>{'可以试试：“123 加 456 等于多少？”并查看工具调用记录。'}</p>
          </div>
        }
      >
        <Index each={props.messages}>
          {(message) => (
            <ChatMessage
              message={message()}
              onCopy={props.onCopy}
              onDelete={props.onDelete}
              onRegenerate={props.onRegenerate}
              onResend={props.onResend}
              onSave={props.onSave}
              onStop={props.onStop}
              pending={props.pending}
            />
          )}
        </Index>
      </Show>
    </div>
  );
};

export default MessageList;
