import { Markdown } from '@liry-a/markdown';
import type { ChatMessage as ChatMessageValue } from '@/utils/chat-store.js';
import styles from './index.module.css';

type ChatMessageProps = {
  message: ChatMessageValue;
};

const ChatMessage = ({ message }: ChatMessageProps) => {
  return (
    <article class={styles[message.role]}>
      <span class={styles['label']}>{message.role === 'user' ? '你' : 'Agent'}</span>
      <div class={styles['content']}>
        <Markdown>{message.content}</Markdown>
      </div>
    </article>
  );
};

export default ChatMessage;
