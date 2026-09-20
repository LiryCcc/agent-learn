import styles from './index.module.css';

type DeepThinkingToggleProps = {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
};

const DeepThinkingToggle = (props: DeepThinkingToggleProps) => {
  return (
    <label className={styles['toggle']}>
      <input
        checked={props.checked}
        disabled={props.disabled}
        onChange={(event) => {
          props.onChange(event.currentTarget.checked);
        }}
        type='checkbox'
      />
      <span className={styles['track']} aria-hidden='true'>
        <span className={styles['thumb']} />
      </span>
      <span className={styles['label']}>{'深度思考'}</span>
    </label>
  );
};

export default DeepThinkingToggle;
