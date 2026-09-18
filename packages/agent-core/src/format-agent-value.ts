export const formatAgentValue = (value: unknown) => {
  if (typeof value === 'string') {
    return value;
  }

  try {
    const serializedValue: unknown = JSON.stringify(value, null, 2);

    return typeof serializedValue === 'string' ? serializedValue : String(value);
  } catch {
    return String(value);
  }
};
