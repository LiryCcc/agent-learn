import type { ChatConversation } from '@/utils/chat-types.js';
import styles from './index.module.css';

type ConversationListProps = {
  activeConversationId: string | null;
  conversations: ChatConversation[];
  disabled: boolean;
  onCreate: () => void;
  onDelete: (conversationId: string) => void;
  onSelect: (conversationId: string) => void;
};

const formatUpdatedAt = (timestamp: number) => {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    month: 'numeric',
    day: 'numeric'
  }).format(timestamp);
};

const ConversationList = (props: ConversationListProps) => {
  return (
    <aside className={styles['sidebar']} aria-label='对话列表'>
      <div className={styles['header']}>
        <strong>{'对话'}</strong>
        <button disabled={props.disabled} onClick={props.onCreate} type='button'>
          {'新建'}
        </button>
      </div>
      <div className={styles['list']}>
        {props.conversations.map((conversation) => (
          <article
            className={`${styles['item'] ?? ''} ${props.activeConversationId === conversation.id ? (styles['active-item'] ?? '') : ''}`}
            key={conversation.id}
          >
            <button
              className={styles['select-button']}
              disabled={props.disabled}
              onClick={() => {
                props.onSelect(conversation.id);
              }}
              type='button'
            >
              <strong>{conversation.title}</strong>
              <span>{`${String(conversation.messages.length)} 条消息 · ${formatUpdatedAt(conversation.updatedAt)}`}</span>
            </button>
            <button
              aria-label={`删除对话：${conversation.title}`}
              className={styles['delete-button']}
              disabled={props.disabled}
              onClick={() => {
                props.onDelete(conversation.id);
              }}
              title='删除对话'
              type='button'
            >
              {'×'}
            </button>
          </article>
        ))}
      </div>
    </aside>
  );
};

export default ConversationList;
