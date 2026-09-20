import type { ChatToolCall } from '@/utils/chat-types.js';
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
    <details className={styles['record']} open={props.toolCall.status !== 'finished'}>
      <summary className={styles['summary']}>
        <span className={styles['tool-icon']}>{'⌘'}</span>
        <strong>{props.toolCall.name}</strong>
        <span className={styles[`status-${props.toolCall.status}`]}>{getStatusLabel(props.toolCall.status)}</span>
      </summary>
      <div className={styles['details']}>
        <div>
          <span className={styles['field-label']}>{'输入'}</span>
          <pre>{props.toolCall.input}</pre>
        </div>
        {props.toolCall.output ? (
          <div>
            <span className={styles['field-label']}>{'输出'}</span>
            <pre>{props.toolCall.output}</pre>
          </div>
        ) : null}
        {props.toolCall.error ? <p className={styles['error']}>{props.toolCall.error}</p> : null}
      </div>
    </details>
  );
};

export default ToolCallRecord;
