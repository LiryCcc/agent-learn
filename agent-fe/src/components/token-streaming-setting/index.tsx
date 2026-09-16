import styles from './index.module.css';

type TokenStreamingSettingProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

const TokenStreamingSetting = (props: TokenStreamingSettingProps) => {
  return (
    <label class={styles['setting']}>
      <span class={styles['copy']}>
        <strong>{'逐 Token 流式输出'}</strong>
        <small>{'开启后，模型生成的文本会逐步显示；关闭时等待当前模型调用完成后再显示。'}</small>
      </span>
      <span class={styles['control']}>
        <input
          checked={props.checked}
          onChange={(event) => props.onChange(event.currentTarget.checked)}
          type='checkbox'
        />
        <span class={styles['track']} aria-hidden='true'>
          <span class={styles['thumb']} />
        </span>
      </span>
    </label>
  );
};

export default TokenStreamingSetting;
