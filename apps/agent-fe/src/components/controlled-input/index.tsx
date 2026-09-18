import type { JSX } from 'solid-js';
import styles from './index.module.css';

type ControlledInputProps = {
  autocomplete?: JSX.InputHTMLAttributes<HTMLInputElement>['autocomplete'];
  inputmode?: JSX.InputHTMLAttributes<HTMLInputElement>['inputmode'];
  label: string;
  name: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  type: JSX.InputHTMLAttributes<HTMLInputElement>['type'];
  value: string;
};

const ControlledInput = (props: ControlledInputProps) => {
  return (
    <label class={styles['field']}>
      <span class={styles['label']}>{props.label}</span>
      <input
        autocomplete={props.autocomplete}
        class={styles['input']}
        inputmode={props.inputmode}
        name={props.name}
        onInput={(event) => {
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
