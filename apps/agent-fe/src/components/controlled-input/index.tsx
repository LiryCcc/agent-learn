import type { HTMLInputTypeAttribute, InputHTMLAttributes } from 'react';
import styles from './index.module.css';

type ControlledInputProps = {
  autoComplete?: InputHTMLAttributes<HTMLInputElement>['autoComplete'];
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  label: string;
  name: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  type: HTMLInputTypeAttribute;
  value: string;
};

const ControlledInput = (props: ControlledInputProps) => {
  return (
    <label className={styles['field']}>
      <span className={styles['label']}>{props.label}</span>
      <input
        autoComplete={props.autoComplete}
        className={styles['input']}
        inputMode={props.inputMode}
        name={props.name}
        onChange={(event) => {
          props.onValueChange(event.currentTarget.value);
        }}
        placeholder={props.placeholder}
        type={props.type}
        value={props.value}
      />
    </label>
  );
};

export default ControlledInput;
