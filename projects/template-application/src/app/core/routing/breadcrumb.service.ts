import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { distinctUntilChanged, filter, map, startWith } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { encodePathSegment } from './routes';
import { Breadcrumb } from './breadcrumb.model';

/**
 * Builds a breadcrumb trail reactively on every navigation.
 *
 * Labels resolve in priority order: route `data['breadcrumb']` (static or via
 * a resolver), then a humanized fallback of the URL segment.
 */
@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private readonly router = inject(Router);

  readonly breadcrumbs$: Observable<Breadcrumb[]>;

  constructor() {
    this.breadcrumbs$ = this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.buildTrail(this.router.routerState.snapshot.root)),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    );
  }

  private buildTrail(route: ActivatedRouteSnapshot): Breadcrumb[] {
    const crumbs: Breadcrumb[] = [];
    let accumulatedPath = '';

    const chain = this.flattenRoute(route);

    for (const segment of chain) {
      if (!segment.routeConfig?.path) {
        continue;
      }

      const resolvedPath = segment.url.map((s) => s.path).join('/');
      const encodedPath = segment.url.map((s) => encodePathSegment(s.path)).join('/');
      accumulatedPath += `/${encodedPath}`;

      const label = this.resolveLabel(segment, resolvedPath);

      crumbs.push({
        label,
        route: accumulatedPath,
      });
    }

    return crumbs;
  }

  private resolveLabel(segment: ActivatedRouteSnapshot, rawSegment: string): string {
    const dataLabel = segment.data['breadcrumb'];
    if (typeof dataLabel === 'string' && dataLabel) {
      return dataLabel;
    }
    return this.humanize(rawSegment);
  }

  private flattenRoute(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot[] {
    const chain: ActivatedRouteSnapshot[] = [];
    let current: ActivatedRouteSnapshot | null = route;
    while (current) {
      chain.push(current);
      current = current.firstChild;
    }
    return chain;
  }

  /** e.g. 'not-found' → 'Not Found' */
  private humanize(segment: string): string {
    return segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
