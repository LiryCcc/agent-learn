import { createStore } from '@tanstack/solid-store';

export type ChatRole = 'assistant' | 'user';
export type ChatMessageStatus = 'complete' | 'failed' | 'stopped' | 'streaming';
export type ChatToolCallStatus = 'error' | 'finished' | 'running';

export type ChatToolCall = {
  id: string;
  input: string;
  name: string;
  status: ChatToolCallStatus;
  error?: string;
  output?: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  status: ChatMessageStatus;
  error?: string;
  toolCalls?: ChatToolCall[];
};

export type NewChatMessage = Omit<ChatMessage, 'id'>;

type ChatState = {
  messages: ChatMessage[];
};

export const chatStore = createStore<ChatState>({
  messages: []
});

const createMessageId = () => {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const appendChatMessage = (messageValue: NewChatMessage) => {
  const message: ChatMessage = {
    id: createMessageId(),
    ...messageValue
  };

  chatStore.setState((state) => ({
    ...state,
    messages: [...state.messages, message]
  }));

  return message;
};

export const updateChatMessage = (messageId: string, update: Partial<Omit<ChatMessage, 'id'>>) => {
  chatStore.setState((state) => ({
    ...state,
    messages: state.messages.map((message) => (message.id === messageId ? { ...message, ...update } : message))
  }));
};

export const upsertChatToolCall = (messageId: string, toolCall: ChatToolCall) => {
  chatStore.setState((state) => ({
    ...state,
    messages: state.messages.map((message) => {
      if (message.id !== messageId) {
        return message;
      }

      const toolCalls = message.toolCalls ?? [];
      const hasToolCall = toolCalls.some((record) => record.id === toolCall.id);

      return {
        ...message,
        toolCalls: hasToolCall
          ? toolCalls.map((record) => (record.id === toolCall.id ? toolCall : record))
          : [...toolCalls, toolCall]
      };
    })
  }));
};

export const removeChatMessagesAfter = (messageId: string) => {
  chatStore.setState((state) => {
    const messageIndex = state.messages.findIndex((message) => message.id === messageId);

    return {
      ...state,
      messages: messageIndex === -1 ? state.messages : state.messages.slice(0, messageIndex + 1)
    };
  });
};

export const removeChatMessagesFrom = (messageId: string) => {
  chatStore.setState((state) => {
    const messageIndex = state.messages.findIndex((message) => message.id === messageId);

    return {
      ...state,
      messages: messageIndex === -1 ? state.messages : state.messages.slice(0, messageIndex)
    };
  });
};

export const clearChatMessages = () => {
  chatStore.setState((state) => ({ ...state, messages: [] }));
};
