import { createStore } from '@tanstack/solid-store';

type ConversationState = {
  activeConversationId: string | null;
};

export const conversationStore = createStore<ConversationState>({
  activeConversationId: null
});

export const selectConversation = (conversationId: string | null) => {
  conversationStore.setState((state) => ({ ...state, activeConversationId: conversationId }));
};
