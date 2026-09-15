import { createStore } from '@tanstack/solid-store';

export type ChatRole = 'assistant' | 'user';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type ChatState = {
  messages: ChatMessage[];
};

export const chatStore = createStore<ChatState>({
  messages: []
});

const createMessageId = () => {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const appendChatMessage = (role: ChatRole, content: string) => {
  const message: ChatMessage = {
    id: createMessageId(),
    role,
    content
  };

  chatStore.setState((state) => ({
    ...state,
    messages: [...state.messages, message]
  }));
};

export const clearChatMessages = () => {
  chatStore.setState((state) => ({ ...state, messages: [] }));
};
