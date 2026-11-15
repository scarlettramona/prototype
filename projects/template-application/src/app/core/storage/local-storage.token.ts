import { isPlatformBrowser } from '@angular/common';
import { inject, InjectionToken, PLATFORM_ID } from '@angular/core';
// maybe we want to implement ssr in future who knows

/*
 * LocalStorage is wrapper class for localStorage, operations can fail for various reasons, the wrapper is providing error handling.
 */
class LocalStorage implements Storage {
  get length(): number {
    try {
      return localStorage.length;
    } catch {
      return 0;
      /* if reading length fails return 0 */
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch {
      /* if clearing fails ignore it */
    }
  }

  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
      /* if storage is blocked return null instead of crashing */
    }
  }

  key(index: number): string | null {
    try {
      return localStorage.key(index);
    } catch {
      return null;
      /* if reading fails return null */
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* if removal fails dont break the app */
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* if quota is exceeded or storage is disabled ignore it and be quiet */
    }
  }
}

const getStorage = (platformId: object): Storage | null => (isPlatformBrowser(platformId) ? new LocalStorage() : null);

export const LOCAL_STORAGE = new InjectionToken<Storage | null>('LOCAL_STORAGE', {
  providedIn: 'root',
  factory: (): Storage | null => getStorage(inject(PLATFORM_ID)),
});
