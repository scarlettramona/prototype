import { DOCUMENT, inject, Injectable, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'theme';

/** Light/dark theme, applied as a `theme-dark`/`theme-light` class on <html> and remembered in localStorage. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly _theme = signal<ThemeMode>('dark');

  readonly theme = this._theme.asReadonly();

  constructor() {
    const stored = readStorage();
    if (stored === 'dark' || stored === 'light') {
      this.setTheme(stored);
    }
  }

  toggle(): void {
    this.setTheme(this._theme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: ThemeMode): void {
    this._theme.set(theme);
    writeStorage(theme);
    const classes = this.document.documentElement.classList;
    classes.toggle('theme-dark', theme === 'dark');
    classes.toggle('theme-light', theme === 'light');
  }
}

// localStorage can throw when storage is blocked or full; the theme just won't persist.
function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}
