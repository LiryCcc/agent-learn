import systemPromptTemplate from './system-prompt.md';

export const createSystemPrompt = (model: string) => {
  return systemPromptTemplate.replace('{{model}}', JSON.stringify(model));
};
