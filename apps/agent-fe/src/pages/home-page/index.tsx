import { Link } from '@tanstack/react-router';
import styles from './index.module.css';

const HomePage = () => {
  return (
    <main className={styles['page']}>
      <title>{'Liry Agent'}</title>
      <section className={styles['hero']}>
        <p className={styles['eyebrow']}>{'LOCAL-FIRST · LANGGRAPH'}</p>
        <h1>{'把 Agent 留在浏览器里'}</h1>
        <p className={styles['summary']}>
          {'使用自己的模型配置，在本地浏览器中运行一个由 LangGraph 驱动的轻量 Agent。'}
        </p>
        <div className={styles['actions']}>
          <Link className={styles['primary-button']} to='/agent'>
            {'开始使用'}
          </Link>
          <Link className={styles['secondary-button']} to='/settings'>
            {'配置模型'}
          </Link>
        </div>
      </section>

      <section className={styles['feature-grid']} aria-label='应用能力'>
        <article className={styles['feature-card']}>
          <span>{'01'}</span>
          <h2>{'浏览器运行'}</h2>
          <p>{'Agent 逻辑由独立的 agent-core 库提供，并直接打包到前端。'}</p>
        </article>
        <article className={styles['feature-card']}>
          <span>{'02'}</span>
          <h2>{'本地配置'}</h2>
          <p>{'TanStack DB 持久化 API Key、Base URL 与模型名。'}</p>
        </article>
        <article className={styles['feature-card']}>
          <span>{'03'}</span>
          <h2>{'清晰分层'}</h2>
          <p>{'路由、状态、API、页面与组件各自保持单一职责。'}</p>
        </article>
      </section>
    </main>
  );
};

export default HomePage;
