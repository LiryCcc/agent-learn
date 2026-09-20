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
      className={`${styles['actions'] ?? ''} ${props.align === 'end' ? (styles['actions-end'] ?? '') : ''} ${props.visible === true ? (styles['actions-visible'] ?? '') : ''}`}
    >
      {props.actions.map((action) => (
        <button
          className={`${styles['action'] ?? ''} ${action.tone === 'danger' ? (styles['danger-action'] ?? '') : ''}`}
          disabled={action.disabled}
          key={action.label}
          onClick={action.onClick}
          type='button'
        >
          {action.label}
        </button>
      ))}
    </div>
  );
};

export default MessageActions;
