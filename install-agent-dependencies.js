import { spawnSync } from 'node:child_process';

const commands = [
  {
    description: 'Installing LangGraph agent dependencies in agent-core',
    args: [
      '--filter',
      '@liry-a/agent-core',
      'add',
      '@langchain/openai',
      'zod',
    ],
  },
  {
    description: 'Installing Solid and TanStack dependencies in agent-fe',
    args: [
      '--filter',
      '@liry-a/agent-fe',
      'add',
      '@liry-a/agent-core@workspace:*',
      '@tanstack/solid-query',
      '@tanstack/solid-query-devtools',
      '@tanstack/solid-router',
      '@tanstack/solid-router-devtools',
      '@tanstack/solid-store',
    ],
  },
];

const runPnpm = ({ description, args }) => {
  console.log(`\n${description}...`);

  const result = spawnSync('pnpm', args, {
    cwd: import.meta.dirname,
    shell: false,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`Failed to start pnpm: ${result.error.message}`);
    return false;
  }

  if (result.status !== 0) {
    console.error(`pnpm exited with status ${result.status ?? 'unknown'}.`);
    return false;
  }

  return true;
};

for (const command of commands) {
  if (!runPnpm(command)) {
    process.exitCode = 1;
    break;
  }
}
