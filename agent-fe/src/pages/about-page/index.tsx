import { buildInfo, formatBuildTime, formatBuildValue, formatCommit } from '@/utils/build-info.js';
import styles from './index.module.css';

const AboutPage = () => {
  const buildDetails = [
    {
      label: 'Git 提交',
      value: formatCommit(buildInfo.commit),
      title: formatBuildValue(buildInfo.commit)
    },
    {
      label: '构建分支',
      value: formatBuildValue(buildInfo.branch)
    },
    {
      label: '构建时间',
      value: formatBuildTime(buildInfo.builtAt),
      title: buildInfo.builtAt
    },
    {
      label: '构建模式',
      value: formatBuildValue(buildInfo.mode)
    }
  ];

  return (
    <main class={styles['page']}>
      <section class={styles['introduction']}>
        <p class={styles['eyebrow']}>{'ABOUT · BUILD'}</p>
        <h1>{'关于 Liry Agent'}</h1>
        <p class={styles['summary']}>
          {'一个在浏览器中运行的本地优先 Agent 工作区，由 Solid、TanStack 与 LangGraph 共同驱动。'}
        </p>
      </section>

      <section aria-labelledby='build-heading' class={styles['build-section']}>
        <div class={styles['section-heading']}>
          <span class={styles['status-dot']} aria-hidden='true' />
          <div>
            <p>{'当前版本'}</p>
            <h2 id='build-heading'>{'构建信息'}</h2>
          </div>
        </div>

        <dl class={styles['build-grid']}>
          {buildDetails.map((detail) => (
            <div class={styles['build-card']}>
              <dt>{detail.label}</dt>
              <dd title={detail.title}>{detail.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
};

export default AboutPage;
