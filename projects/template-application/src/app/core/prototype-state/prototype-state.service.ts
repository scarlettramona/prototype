import { inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { MockDataService } from '../mock-data/mock-data.service';
import { isPrototypeStateName, type PrototypeStateName } from './prototype-states';
import { resolvePrototypeState, stateModule, type ResolvedPrototypeState } from './resolve-prototype-state';

export const STATE_QUERY_PARAM = 'state';

/**
 * Watches `?state=<name>`, resolves the fixture against the mock data and
 * moves to the fixture's route. Screens read `state()` and set themselves up
 * from it; a `null` state means "start fresh".
 */
@Injectable({ providedIn: 'root' })
export class PrototypeStateService {
  private readonly router = inject(Router);
  private readonly data = inject(MockDataService);
  private requested: PrototypeStateName | null = null;

  /** The resolved state for the current `?state=`, or `null`. */
  readonly state = signal<ResolvedPrototypeState | null>(null);
  /** Set when `?state=` names an unknown state or its fixture doesn't fit the data. */
  readonly error = signal<string | null>(null);

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.sync());
  }

  /** Jumps to a state (what the dev menu calls). */
  apply(name: PrototypeStateName): Promise<boolean> {
    return this.router.navigate([], { queryParams: { [STATE_QUERY_PARAM]: name }, queryParamsHandling: 'merge' });
  }

  /** Leaves the current state, staying on the page. */
  clear(): Promise<boolean> {
    return this.router.navigate([], { queryParams: { [STATE_QUERY_PARAM]: null }, queryParamsHandling: 'merge' });
  }

  private async sync(): Promise<void> {
    const raw = this.router.parseUrl(this.router.url).queryParams[STATE_QUERY_PARAM] as unknown;
    if (raw === undefined || raw === null) {
      this.requested = null;
      this.state.set(null);
      this.error.set(null);
      return;
    }
    if (!isPrototypeStateName(raw)) {
      this.requested = null;
      this.state.set(null);
      this.error.set(`Unknown state: ${String(raw)}`);
      console.warn(`[prototype-state] Unknown state "${String(raw)}"`);
      return;
    }
    if (raw === this.requested) return;
    this.requested = raw;

    try {
      const resolved =
        stateModule(raw) === 'vnv'
          ? resolvePrototypeState(raw, { vnv: await this.data.vnvDataset() })
          : resolvePrototypeState(raw, { ill: await this.data.illDataset() });
      if (this.requested !== raw) return; // superseded while loading
      this.error.set(null);
      this.state.set(resolved);

      const target = this.router.createUrlTree(resolved.route, { queryParams: { [STATE_QUERY_PARAM]: raw } });
      const onRoute = this.router.isActive(target, {
        paths: 'exact',
        queryParams: 'ignored',
        fragment: 'ignored',
        matrixParams: 'ignored',
      });
      if (!onRoute) await this.router.navigateByUrl(target, { replaceUrl: true });
    } catch (e) {
      this.requested = null;
      this.state.set(null);
      this.error.set(e instanceof Error ? e.message : String(e));
      console.error('[prototype-state]', e);
    }
  }
}
