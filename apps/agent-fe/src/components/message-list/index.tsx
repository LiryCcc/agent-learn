import ChatMessage from '@/components/chat-message/index.jsx';
import type { ChatMessage as ChatMessageValue } from '@/utils/chat-types.js';
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

const attachMessageListContent = (element: HTMLDivElement | null) => {
  if (!element) {
    return;
  }

  const listElement = element.parentElement;

  if (!(listElement instanceof HTMLElement)) {
    return;
  }

  const observer = new ResizeObserver(() => {
    if (element.scrollHeight <= listElement.clientHeight) {
      return;
    }

    listElement.scrollTo({
      behavior: 'smooth',
      top: listElement.scrollHeight
    });
  });

  observer.observe(element);

  return () => {
    observer.disconnect();
  };
};

const MessageList = (props: MessageListProps) => {
  return (
    <div className={styles['message-list']} aria-live='polite'>
      <div className={styles['message-list-content']} ref={attachMessageListContent}>
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
    </div>
  );
};

export default MessageList;
