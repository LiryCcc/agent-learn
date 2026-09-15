const unknownValue = 'unknown';

export const buildInfo = __BUILD_INFO__;

export const formatBuildTime = (builtAt: string) => {
  const date = new Date(builtAt);

  if (Number.isNaN(date.getTime())) {
    return unknownValue;
  }

  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
    year: 'numeric'
  }).format(date);
};

export const formatCommit = (commit: string) => {
  return commit === unknownValue ? commit : commit.slice(0, 12);
};

export const formatBuildValue = (value: string) => {
  return value.trim().length > 0 ? value : unknownValue;
};
