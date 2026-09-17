import styles from './index.module.css';

type DeepThinkingToggleProps = {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
};

const DeepThinkingToggle = (props: DeepThinkingToggleProps) => {
  return (
    <label class={styles['toggle']}>
      <input
        checked={props.checked}
        disabled={props.disabled}
        onChange={(event) => {
          props.onChange(event.currentTarget.checked);
        }}
        type='checkbox'
      />
      <span class={styles['track']} aria-hidden='true'>
        <span class={styles['thumb']} />
      </span>
      <span class={styles['label']}>{'深度思考'}</span>
    </label>
  );
};

export default DeepThinkingToggle;
