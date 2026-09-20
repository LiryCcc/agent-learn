import type { ChatConversation } from './chat-types.js';
import {
  conversationCollection,
  createConversation,
  recoverInterruptedConversation
} from './conversation-collection.js';
import { createObservabilityTraceId, recordObservabilityEvent } from './observability-log.js';
import { conversationSelected, store } from './store.js';

export const selectConversation = (conversationId: string | null) => {
  store.dispatch(conversationSelected(conversationId));
};

const sortConversations = (conversations: ChatConversation[]) => {
  return [...conversations].sort((left, right) => right.updatedAt - left.updatedAt);
};

export const initializeConversationSession = () => {
  conversationCollection.onFirstReady(() => {
    const conversations = sortConversations(conversationCollection.toArray);

    conversations.forEach((conversation) => {
      recoverInterruptedConversation(conversation.id);
    });
    recordObservabilityEvent({
      details: { conversationCount: conversations.length },
      event: 'conversation.interrupted-runs.recovered',
      scope: 'conversation',
      traceId: createObservabilityTraceId('conversation')
    });

    const activeConversationId = store.getState().conversation.activeConversationId;

    if (conversations.some((conversation) => conversation.id === activeConversationId)) {
      return;
    }

    const nextConversation = conversations[0] ?? createConversation();

    selectConversation(nextConversation.id);

    if (conversations.length === 0) {
      recordObservabilityEvent({
        conversationId: nextConversation.id,
        details: { source: 'initialization' },
        event: 'conversation.created',
        scope: 'conversation',
        traceId: createObservabilityTraceId('conversation')
      });
    }
  });
};
