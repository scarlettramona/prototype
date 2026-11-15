import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import type { ActivatedRouteSnapshot } from '@angular/router';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs/operators';

export type Breadcrumb = { label: string; route: string };

/** Breadcrumb trail for the current route, labelled by route `data['breadcrumb']`. */
@Injectable({ providedIn: 'root' })
export class BreadcrumbService {
  private readonly router = inject(Router);

  readonly breadcrumbs = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.buildTrail()),
    ),
    { initialValue: this.buildTrail() },
  );

  private buildTrail(): Breadcrumb[] {
    const crumbs: Breadcrumb[] = [];
    let path = '';
    for (let route: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root; route; route = route.firstChild) {
      if (!route.routeConfig?.path) continue;
      path += '/' + route.url.map((s) => s.path).join('/');
      const label = route.data['breadcrumb'];
      crumbs.push({ label: typeof label === 'string' ? label : route.url.map((s) => s.path).join('/'), route: path });
    }
    return crumbs;
  }
}
