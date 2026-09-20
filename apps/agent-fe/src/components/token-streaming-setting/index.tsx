import styles from './index.module.css';

type TokenStreamingSettingProps = {
  checked: boolean;
  name?: string;
  onChange: (checked: boolean) => void;
};

const TokenStreamingSetting = (props: TokenStreamingSettingProps) => {
  return (
    <label className={styles['setting']}>
      <span className={styles['copy']}>
        <strong>{'逐 Token 流式输出'}</strong>
        <small>{'开启后，模型生成的文本会逐步显示；关闭时等待当前模型调用完成后再显示。'}</small>
      </span>
      <span className={styles['control']}>
        <input
          checked={props.checked}
          name={props.name}
          onChange={(event) => {
            props.onChange(event.currentTarget.checked);
          }}
          type='checkbox'
        />
        <span className={styles['track']} aria-hidden='true'>
          <span className={styles['thumb']} />
        </span>
      </span>
    </label>
  );
};

export default TokenStreamingSetting;
