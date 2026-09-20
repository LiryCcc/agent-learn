export const readFormString = (formData: FormData, name: string, fallback = '') => {
  const value = formData.get(name);

  return typeof value === 'string' ? value : fallback;
};
