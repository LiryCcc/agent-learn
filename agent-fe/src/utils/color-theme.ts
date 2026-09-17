import { createSignal } from 'solid-js';

export type ColorTheme = 'dark' | 'light';

export const COLOR_THEME_STORAGE_KEY = 'liry-agent-color-theme';

export const resolveColorTheme = (storedTheme: string | null, prefersDark: boolean): ColorTheme => {
  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }

  return prefersDark ? 'dark' : 'light';
};

const readInitialColorTheme = (): ColorTheme => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  let storedTheme: string | null = null;

  try {
    storedTheme = window.localStorage.getItem(COLOR_THEME_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  return resolveColorTheme(storedTheme, prefersDark);
};

const [colorTheme, setColorThemeSignal] = createSignal<ColorTheme>(readInitialColorTheme());

const applyColorTheme = (theme: ColorTheme) => {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset['theme'] = theme;
  document.documentElement.style.colorScheme = theme;
};

export const initializeColorTheme = () => {
  applyColorTheme(colorTheme());
};

export const setColorTheme = (theme: ColorTheme) => {
  setColorThemeSignal(theme);
  applyColorTheme(theme);

  try {
    window.localStorage.setItem(COLOR_THEME_STORAGE_KEY, theme);
  } catch {
    // Keep the in-memory theme active when persistence is unavailable.
  }
};

export const toggleColorTheme = () => {
  const nextTheme = colorTheme() === 'dark' ? 'light' : 'dark';
  setColorTheme(nextTheme);
  return nextTheme;
};

export { colorTheme };
