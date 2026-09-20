import type { KeyboardEvent } from 'react';
import styles from './index.module.css';

type ChatComposerProps = {
  disabled: boolean;
  pending: boolean;
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
};

const ChatComposer = (props: ChatComposerProps) => {
  const canSend = !props.disabled && !props.pending && props.value.trim().length > 0;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();

    if (canSend) {
      props.onSend();
    }
  };

  const handleAction = () => {
    if (props.pending) {
      props.onStop();
      return;
    }

    if (canSend) {
      props.onSend();
    }
  };

  return (
    <div className={styles['composer']}>
      <textarea
        aria-label='对话输入'
        className={styles['input']}
        disabled={props.disabled}
        onChange={(event) => {
          props.onChange(event.currentTarget.value);
        }}
        onKeyDown={handleKeyDown}
        placeholder='输入消息，Enter 发送，Shift+Enter 换行'
        rows={3}
        value={props.value}
      />
      <div className={styles['footer']}>
        <span>{'Enter 发送 · Shift+Enter 换行'}</span>
        <button
          className={`${styles['send-button'] ?? ''} ${props.pending ? (styles['stop-button'] ?? '') : ''}`}
          disabled={!props.pending && !canSend}
          onClick={handleAction}
          type='button'
        >
          {props.pending ? '停止' : '发送'}
        </button>
      </div>
    </div>
  );
};

export default ChatComposer;
