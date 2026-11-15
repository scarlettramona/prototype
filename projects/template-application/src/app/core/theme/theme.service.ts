import { DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { LOCAL_STORAGE } from '../storage/local-storage.token';

// keep these constants in sync with index.html
const DARK_THEME_CLASS_NAME = 'theme-dark';
const LIGHT_THEME_CLASS_NAME = 'theme-light';
const THEME_SELECTED_LOCAL_STORAGE_KEY = 'theme';

export enum ThemeMode {
  DARK = 'dark',
  LIGHT = 'light',
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly localStorage: Storage | null = inject(LOCAL_STORAGE);
  private readonly _themeSelected = signal<ThemeMode>(ThemeMode.DARK);

  readonly themeSelected = this._themeSelected.asReadonly();

  constructor() {
    const themeFromLocalStorage = this.localStorage?.getItem(THEME_SELECTED_LOCAL_STORAGE_KEY) as ThemeMode | null;
    if (themeFromLocalStorage) {
      this.setTheme(themeFromLocalStorage);
    }
  }
  setTheme(theme: ThemeMode): void {
    this._themeSelected.set(theme);
    this.localStorage?.setItem(THEME_SELECTED_LOCAL_STORAGE_KEY, this.themeSelected());
    this.setBodyClasses();
  }
  private setBodyClasses(): void {
    const documentClassList = this.document.documentElement.classList;
    if (this.themeSelected() === ThemeMode.DARK) {
      documentClassList.add(DARK_THEME_CLASS_NAME);
      documentClassList.remove(LIGHT_THEME_CLASS_NAME);
    } else {
      documentClassList.add(LIGHT_THEME_CLASS_NAME);
      documentClassList.remove(DARK_THEME_CLASS_NAME);
    }
  }
}
