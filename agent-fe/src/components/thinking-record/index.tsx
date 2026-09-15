import styles from './index.module.css';

type ThinkingRecordProps = {
  content: string;
  streaming: boolean;
};

const ThinkingRecord = (props: ThinkingRecordProps) => {
  return (
    <details class={styles['record']} open={props.streaming}>
      <summary>
        <span>{'✦'}</span>
        <strong>{props.streaming ? '正在深度思考' : '思考过程'}</strong>
      </summary>
      <p>{props.content}</p>
    </details>
  );
};

export default ThinkingRecord;
