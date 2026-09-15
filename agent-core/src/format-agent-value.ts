export const formatAgentValue = (value: unknown) => {
  if (typeof value === 'string') {
    return value;
  }

  try {
    const serializedValue = JSON.stringify(value, null, 2);

    return serializedValue ?? String(value);
  } catch {
    return String(value);
  }
};
