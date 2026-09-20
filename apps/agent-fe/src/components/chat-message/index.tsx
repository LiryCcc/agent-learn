import MessageActions, { type MessageAction } from '@/components/message-actions/index.jsx';
import ThinkingRecord from '@/components/thinking-record/index.jsx';
import ToolCallRecord from '@/components/tool-call-record/index.jsx';
import type { ChatMessage as ChatMessageValue } from '@/utils/chat-types.js';
import { Markdown } from '@liry-a/markdown';
import { useState, type KeyboardEvent } from 'react';
import styles from './index.module.css';

type ChatMessageProps = {
  message: ChatMessageValue;
  pending: boolean;
  onCopy: (content: string) => void;
  onDelete: (messageId: string) => void;
  onRegenerate: (messageId: string) => void;
  onResend: (messageId: string, content: string) => void;
  onSave: (messageId: string, content: string) => void;
  onStop: () => void;
};

const ChatMessage = (props: ChatMessageProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(props.message.content);
  const canSubmitEdit = !props.pending && draft.trim().length > 0;
  const copyText = props.message.content || props.message.error || '';

  const startEditing = () => {
    setDraft(props.message.content);
    setEditing(true);
  };

  const save = () => {
    if (!canSubmitEdit) {
      return;
    }

    props.onSave(props.message.id, draft.trim());
    setEditing(false);
  };

  const resend = () => {
    if (!canSubmitEdit) {
      return;
    }

    props.onResend(props.message.id, draft.trim());
    setEditing(false);
  };

  const handleEditKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setEditing(false);
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      save();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      resend();
    }
  };

  const actions = (): MessageAction[] => {
    if (props.message.status === 'streaming') {
      return [{ label: '停止', onClick: props.onStop, tone: 'danger' }];
    }

    const copyAction: MessageAction[] = copyText
      ? [
          {
            label: '复制',
            disabled: props.pending,
            onClick: () => {
              props.onCopy(copyText);
            }
          }
        ]
      : [];

    if (props.message.role === 'user') {
      return [
        ...copyAction,
        { label: '编辑', disabled: props.pending, onClick: startEditing },
        {
          label: '删除后续',
          disabled: props.pending,
          onClick: () => {
            props.onDelete(props.message.id);
          },
          tone: 'danger'
        }
      ];
    }

    return [
      ...copyAction,
      {
        label: '重新生成',
        disabled: props.pending,
        onClick: () => {
          props.onRegenerate(props.message.id);
        }
      }
    ];
  };

  return (
    <article className={styles[props.message.role]}>
      <span className={styles['label']}>{props.message.role === 'user' ? '你' : 'Agent'}</span>
      <div className={styles['content']}>
        {editing ? (
          <div className={styles['editor']}>
            <textarea
              aria-label='编辑消息'
              autoFocus={true}
              disabled={props.pending}
              onChange={(event) => {
                setDraft(event.currentTarget.value);
              }}
              onKeyDown={handleEditKeyDown}
              rows={4}
              value={draft}
            />
            <div className={styles['editor-actions']}>
              <button
                disabled={props.pending}
                onClick={() => {
                  setEditing(false);
                }}
                type='button'
              >
                {'取消'}
              </button>
              <button disabled={!canSubmitEdit} onClick={save} type='button'>
                {'保存'}
              </button>
              <button disabled={!canSubmitEdit} onClick={resend} type='button'>
                {'保存并重发'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {props.message.reasoning ? (
              <ThinkingRecord content={props.message.reasoning} streaming={props.message.status === 'streaming'} />
            ) : null}
            {props.message.toolCalls?.map((toolCall) => (
              <ToolCallRecord key={toolCall.id} toolCall={toolCall} />
            ))}
            {props.message.status === 'failed' ? (
              <p className={styles['error']}>{`回复失败：${props.message.error ?? '未知错误'}`}</p>
            ) : props.message.content.length > 0 ? (
              <div className={styles['markdown']}>
                <Markdown>{props.message.content}</Markdown>
                {props.message.status === 'streaming' ? <span className={styles['caret']} aria-hidden='true' /> : null}
              </div>
            ) : (
              <p className={styles['status-text']}>
                {props.message.status === 'stopped' ? '已停止生成' : '正在思考'}
                {props.message.status === 'streaming' ? <span className={styles['caret']} aria-hidden='true' /> : null}
              </p>
            )}
          </>
        )}
      </div>
      {editing ? null : (
        <MessageActions
          actions={actions()}
          align={props.message.role === 'user' ? 'end' : 'start'}
          visible={props.message.status !== 'complete'}
        />
      )}
    </article>
  );
};

export default ChatMessage;
