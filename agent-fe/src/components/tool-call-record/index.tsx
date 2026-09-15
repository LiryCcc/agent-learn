import { Show } from 'solid-js';
import type { ChatToolCall } from '@/utils/chat-store.js';
import styles from './index.module.css';

type ToolCallRecordProps = {
  toolCall: ChatToolCall;
};

const getStatusLabel = (status: ChatToolCall['status']) => {
  if (status === 'running') {
    return '运行中';
  }

  if (status === 'error') {
    return '失败';
  }

  return '已完成';
};

const ToolCallRecord = (props: ToolCallRecordProps) => {
  return (
    <details class={styles['record']} open={props.toolCall.status !== 'finished'}>
      <summary class={styles['summary']}>
        <span class={styles['tool-icon']}>{'⌘'}</span>
        <strong>{props.toolCall.name}</strong>
        <span class={styles[`status-${props.toolCall.status}`]}>{getStatusLabel(props.toolCall.status)}</span>
      </summary>
      <div class={styles['details']}>
        <div>
          <span class={styles['field-label']}>{'输入'}</span>
          <pre>{props.toolCall.input}</pre>
        </div>
        <Show when={props.toolCall.output}>
          {(output) => (
            <div>
              <span class={styles['field-label']}>{'输出'}</span>
              <pre>{output()}</pre>
            </div>
          )}
        </Show>
        <Show when={props.toolCall.error}>{(error) => <p class={styles['error']}>{error()}</p>}</Show>
      </div>
    </details>
  );
};

export default ToolCallRecord;
