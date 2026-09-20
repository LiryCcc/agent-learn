import styles from './index.module.css';

type ConversationFullscreenToggleProps = {
  active: boolean;
  onChange: (active: boolean) => void;
};

const ConversationFullscreenToggle = (props: ConversationFullscreenToggleProps) => {
  const label = props.active ? '退出全屏' : '全屏';

  return (
    <button
      aria-label={label}
      aria-pressed={props.active}
      className={styles['toggle-button']}
      onClick={() => {
        props.onChange(!props.active);
      }}
      title={label}
      type='button'
    >
      <span aria-hidden='true'>{props.active ? '↙' : '↗'}</span>
      <span>{label}</span>
    </button>
  );
};

export default ConversationFullscreenToggle;
