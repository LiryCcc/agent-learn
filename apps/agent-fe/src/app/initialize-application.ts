import { router } from '@/router/index.js';
import { buildInfo } from '@/utils/build-info.js';
import { initializeColorTheme } from '@/utils/color-theme.js';
import { initializeConversationSession } from '@/utils/conversation-store.js';
import {
  createObservabilityTraceId,
  initializeObservabilityLogging,
  recordObservabilityEvent
} from '@/utils/observability-log.js';

export const initializeApplication = () => {
  initializeColorTheme();
  initializeObservabilityLogging();
  recordObservabilityEvent({
    details: {
      branch: buildInfo.branch,
      buildMode: buildInfo.mode,
      commit: buildInfo.commit
    },
    event: 'application.started',
    scope: 'application',
    traceId: createObservabilityTraceId('application')
  });
  router.subscribe('onResolved', (event) => {
    recordObservabilityEvent({
      details: {
        hash: event.toLocation.hash,
        path: event.toLocation.pathname,
        search: event.toLocation.searchStr
      },
      event: 'navigation.changed',
      scope: 'navigation',
      traceId: createObservabilityTraceId('navigation')
    });
  });
  initializeConversationSession();
};
