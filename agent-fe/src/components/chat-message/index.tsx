import MessageActions, { type MessageAction } from '@/components/message-actions/index.jsx';
import ThinkingRecord from '@/components/thinking-record/index.jsx';
import ToolCallRecord from '@/components/tool-call-record/index.jsx';
import type { ChatMessage as ChatMessageValue } from '@/utils/chat-types.js';
import { Markdown } from '@liry-a/markdown';
import { For, Show, createSignal, type JSX } from 'solid-js';
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
  const [editing, setEditing] = createSignal(false);
  const [draft, setDraft] = createSignal(props.message.content);
  const canSubmitEdit = () => !props.pending && draft().trim().length > 0;
  const copyText = () => props.message.content || props.message.error || '';

  const startEditing = () => {
    setDraft(props.message.content);
    setEditing(true);
  };

  const save = () => {
    if (!canSubmitEdit()) {
      return;
    }

    props.onSave(props.message.id, draft().trim());
    setEditing(false);
  };

  const resend = () => {
    if (!canSubmitEdit()) {
      return;
    }

    props.onResend(props.message.id, draft().trim());
    setEditing(false);
  };

  const handleEditKeyDown: JSX.EventHandler<HTMLTextAreaElement, KeyboardEvent> = (event) => {
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

    const copyAction: MessageAction[] = copyText()
      ? [
          {
            label: '复制',
            disabled: props.pending,
            onClick: () => {
              props.onCopy(copyText());
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
    <article class={styles[props.message.role]}>
      <span class={styles['label']}>{props.message.role === 'user' ? '你' : 'Agent'}</span>
      <div class={styles['content']}>
        <Show
          when={!editing()}
          fallback={
            <div class={styles['editor']}>
              <textarea
                aria-label='编辑消息'
                autofocus
                disabled={props.pending}
                onInput={(event) => setDraft(event.currentTarget.value)}
                onKeyDown={handleEditKeyDown}
                rows='4'
                value={draft()}
              />
              <div class={styles['editor-actions']}>
                <button disabled={props.pending} onClick={() => setEditing(false)} type='button'>
                  {'取消'}
                </button>
                <button disabled={!canSubmitEdit()} onClick={save} type='button'>
                  {'保存'}
                </button>
                <button disabled={!canSubmitEdit()} onClick={resend} type='button'>
                  {'保存并重发'}
                </button>
              </div>
            </div>
          }
        >
          <Show when={props.message.reasoning}>
            {(reasoning) => <ThinkingRecord content={reasoning()} streaming={props.message.status === 'streaming'} />}
          </Show>
          <For each={props.message.toolCalls}>{(toolCall) => <ToolCallRecord toolCall={toolCall} />}</For>
          <Show
            when={props.message.status !== 'failed'}
            fallback={<p class={styles['error']}>{`回复失败：${props.message.error ?? '未知错误'}`}</p>}
          >
            <Show
              when={props.message.content.length > 0}
              fallback={
                <p class={styles['status-text']}>
                  {props.message.status === 'stopped' ? '已停止生成' : '正在思考'}
                  <Show when={props.message.status === 'streaming'}>
                    <span class={styles['caret']} aria-hidden='true' />
                  </Show>
                </p>
              }
            >
              <div class={styles['markdown']}>
                <Markdown>{props.message.content}</Markdown>
                <Show when={props.message.status === 'streaming'}>
                  <span class={styles['caret']} aria-hidden='true' />
                </Show>
              </div>
            </Show>
          </Show>
        </Show>
      </div>
      <Show when={!editing()}>
        <MessageActions
          actions={actions()}
          align={props.message.role === 'user' ? 'end' : 'start'}
          visible={props.message.status !== 'complete'}
        />
      </Show>
    </article>
  );
};

export default ChatMessage;
