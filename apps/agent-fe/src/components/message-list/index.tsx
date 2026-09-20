import ChatMessage from '@/components/chat-message/index.jsx';
import type { ChatMessage as ChatMessageValue } from '@/utils/chat-types.js';
import { useEffect, useRef } from 'react';
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
  const listElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const contentSnapshot = props.messages
      .map((message) => {
        const toolCallSnapshot = message.toolCalls
          ?.map((toolCall) => `${toolCall.id}:${toolCall.status}:${toolCall.output ?? ''}`)
          .join(',');

        return `${message.content}:${message.reasoning ?? ''}:${message.status}:${toolCallSnapshot ?? ''}`;
      })
      .join('|');

    const currentListElement = listElement.current;

    if (contentSnapshot && currentListElement) {
      queueMicrotask(() => {
        currentListElement.scrollTo({ behavior: 'smooth', top: currentListElement.scrollHeight });
      });
    }
  }, [props.messages]);

  return (
    <div className={styles['message-list']} aria-live='polite' ref={listElement}>
      {props.messages.length > 0 ? (
        props.messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onCopy={props.onCopy}
            onDelete={props.onDelete}
            onRegenerate={props.onRegenerate}
            onResend={props.onResend}
            onSave={props.onSave}
            onStop={props.onStop}
            pending={props.pending}
          />
        ))
      ) : (
        <div className={styles['empty-state']}>
          <span>{'✦'}</span>
          <strong>{'开始一段新对话'}</strong>
          <p>{'可以试试：“123 加 456 等于多少？”并查看工具调用记录。'}</p>
        </div>
      )}
    </div>
  );
};

export default MessageList;
