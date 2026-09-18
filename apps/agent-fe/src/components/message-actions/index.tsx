import { For } from 'solid-js';
import styles from './index.module.css';

export type MessageAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'danger' | 'normal';
};

type MessageActionsProps = {
  actions: MessageAction[];
  align: 'end' | 'start';
  visible?: boolean;
};

const MessageActions = (props: MessageActionsProps) => {
  return (
    <div
      class={`${styles['actions'] ?? ''} ${props.align === 'end' ? (styles['actions-end'] ?? '') : ''} ${props.visible === true ? (styles['actions-visible'] ?? '') : ''}`}
    >
      <For each={props.actions}>
        {(action) => (
          <button
            class={`${styles['action'] ?? ''} ${action.tone === 'danger' ? (styles['danger-action'] ?? '') : ''}`}
            disabled={action.disabled}
            onClick={action.onClick}
            type='button'
          >
            {action.label}
          </button>
        )}
      </For>
    </div>
  );
};

export default MessageActions;
