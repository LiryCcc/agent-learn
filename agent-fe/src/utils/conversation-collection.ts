import { createCollection, localStorageCollectionOptions } from '@tanstack/solid-db';
import {
  chatConversationSchema,
  type ChatConversation,
  type ChatMessage,
  type ChatToolCall,
  type NewChatMessage
} from './chat-types.js';

const NEW_CONVERSATION_TITLE = '新对话';
const TITLE_LENGTH = 28;

export const conversationCollection = createCollection(
  localStorageCollectionOptions({
    id: 'chat-conversations',
    storageKey: 'liry-agent-chat-conversations',
    getKey: (conversation) => conversation.id,
    schema: chatConversationSchema
  })
);

const createId = () => {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const createConversationTitle = (content: string) => {
  const normalizedContent = content.trim().replace(/\s+/g, ' ');

  if (normalizedContent.length <= TITLE_LENGTH) {
    return normalizedContent;
  }

  return `${normalizedContent.slice(0, TITLE_LENGTH)}…`;
};

export const createConversation = () => {
  const timestamp = Date.now();
  const conversation: ChatConversation = {
    id: createId(),
    title: NEW_CONVERSATION_TITLE,
    createdAt: timestamp,
    updatedAt: timestamp,
    deepThinking: false,
    messages: []
  };

  conversationCollection.insert(conversation);

  return conversation;
};

export const deleteConversation = (conversationId: string) => {
  if (conversationCollection.has(conversationId)) {
    conversationCollection.delete(conversationId);
  }
};

export const appendConversationMessage = (conversationId: string, messageValue: NewChatMessage) => {
  const message: ChatMessage = {
    id: createId(),
    ...messageValue
  };

  conversationCollection.update(conversationId, (draft) => {
    const isFirstUserMessage = message.role === 'user' && !draft.messages.some((item) => item.role === 'user');

    draft.messages.push(message);
    draft.updatedAt = Date.now();

    if (isFirstUserMessage) {
      draft.title = createConversationTitle(message.content);
    }
  });

  return message;
};

export const updateConversationMessage = (
  conversationId: string,
  messageId: string,
  update: Partial<Omit<ChatMessage, 'id'>>
) => {
  conversationCollection.update(conversationId, (draft) => {
    const messageIndex = draft.messages.findIndex((message) => message.id === messageId);
    const message = draft.messages[messageIndex];

    if (!message) {
      return;
    }

    if (update.content !== undefined) {
      message.content = update.content;
    }

    if (update.status !== undefined) {
      message.status = update.status;
    }

    if (update.error !== undefined) {
      message.error = update.error;
    }

    if (update.reasoning !== undefined) {
      message.reasoning = update.reasoning;
    }

    if (update.toolCalls !== undefined) {
      message.toolCalls = update.toolCalls;
    }

    draft.updatedAt = Date.now();

    if (message.role === 'user' && !draft.messages.slice(0, messageIndex).some((item) => item.role === 'user')) {
      draft.title = createConversationTitle(update.content ?? message.content);
    }
  });
};

export const upsertConversationToolCall = (conversationId: string, messageId: string, toolCall: ChatToolCall) => {
  conversationCollection.update(conversationId, (draft) => {
    const message = draft.messages.find((item) => item.id === messageId);

    if (!message) {
      return;
    }

    const existingToolCall = message.toolCalls?.find((record) => record.id === toolCall.id);

    if (existingToolCall) {
      existingToolCall.input = toolCall.input;
      existingToolCall.name = toolCall.name;
      existingToolCall.status = toolCall.status;

      if (toolCall.error !== undefined) {
        existingToolCall.error = toolCall.error;
      }

      if (toolCall.output !== undefined) {
        existingToolCall.output = toolCall.output;
      }
    } else if (message.toolCalls) {
      message.toolCalls.push(toolCall);
    } else {
      message.toolCalls = [toolCall];
    }

    draft.updatedAt = Date.now();
  });
};

export const removeConversationMessagesAfter = (conversationId: string, messageId: string) => {
  conversationCollection.update(conversationId, (draft) => {
    const messageIndex = draft.messages.findIndex((message) => message.id === messageId);

    if (messageIndex !== -1) {
      draft.messages.splice(messageIndex + 1);
      draft.updatedAt = Date.now();
    }
  });
};

export const removeConversationMessagesFrom = (conversationId: string, messageId: string) => {
  conversationCollection.update(conversationId, (draft) => {
    const messageIndex = draft.messages.findIndex((message) => message.id === messageId);

    if (messageIndex !== -1) {
      draft.messages.splice(messageIndex);
      draft.updatedAt = Date.now();
    }
  });
};

export const clearConversationMessages = (conversationId: string) => {
  conversationCollection.update(conversationId, (draft) => {
    draft.messages.splice(0);
    draft.title = NEW_CONVERSATION_TITLE;
    draft.updatedAt = Date.now();
  });
};

export const setConversationDeepThinking = (conversationId: string, enabled: boolean) => {
  conversationCollection.update(conversationId, (draft) => {
    draft.deepThinking = enabled;
    draft.updatedAt = Date.now();
  });
};

export const recoverInterruptedConversation = (conversationId: string) => {
  conversationCollection.update(conversationId, (draft) => {
    let changed = false;

    draft.messages.forEach((message) => {
      if (message.status === 'streaming') {
        message.status = 'stopped';
        changed = true;

        message.toolCalls?.forEach((toolCall) => {
          if (toolCall.status === 'running') {
            toolCall.status = 'error';
            toolCall.error = '页面刷新导致工具调用中断。';
          }
        });
      }
    });

    if (changed) {
      draft.updatedAt = Date.now();
    }
  });
};
