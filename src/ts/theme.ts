/**
 * Theme management - light/dark mode with system preference detection
 */

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'claude-history-theme';

/** Get the current effective theme (resolves 'system' to actual theme) */
function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

/** Get stored theme preference */
export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

/** Apply theme to document */
function applyTheme(theme: Theme): void {
  const effective = getEffectiveTheme(theme);
  document.documentElement.setAttribute('data-theme', effective);
  document.documentElement.style.colorScheme = effective;
}

/** Set and persist theme */
export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

/** Cycle through themes: dark -> light -> system -> dark */
export function cycleTheme(): Theme {
  const current = getStoredTheme();
  const next: Theme = current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark';
  setTheme(next);
  return next;
}

/** Initialize theme system */
export function initTheme(): void {
  // Apply initial theme
  applyTheme(getStoredTheme());

  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system');
    }
  });
}

/** Get display name for current theme */
export function getThemeLabel(theme: Theme): string {
  switch (theme) {
    case 'light':
      return 'Light';
    case 'dark':
      return 'Dark';
    case 'system':
      return 'System';
  }
}
