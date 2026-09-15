import type { ChatMessage as ChatMessageValue } from '@/utils/chat-store.js';
import styles from './index.module.css';

type ChatMessageProps = {
  message: ChatMessageValue;
};

const ChatMessage = ({ message }: ChatMessageProps) => {
  return (
    <article class={styles[message.role]}>
      <span class={styles['label']}>{message.role === 'user' ? '你' : 'Agent'}</span>
      <p class={styles['content']}>{message.content}</p>
    </article>
  );
};

export default ChatMessage;
