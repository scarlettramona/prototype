import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { Tree, TreeItem, TreeItemGroup } from '@angular/aria/tree';
import { NAV_ITEMS } from './sidenav.config';
import { NavItem } from './sidenav.model';

/** strip query/fragment and guarantee a single leading slash. */
function normalizePath(url: string): string {
  const path = url.split(/[?#]/)[0];
  return path.startsWith('/') ? path : `/${path}`;
}

/** true when `route` is `url` itself or a parent segment of it. */
function isRoutePrefix(route: string, url: string): boolean {
  const r = normalizePath(route);
  return url === r || url.startsWith(`${r}/`);
}

/**
 * walk the nav tree and return the root→leaf chain of items whose `route`
 * is the longest prefix of the current URL. Returns an
 * empty array when nothing matches.
 */
function activeChain(items: NavItem[], url: string): NavItem[] {
  let best: NavItem[] = [];
  let bestLen = -1;

  const walk = (nodes: NavItem[], trail: NavItem[]): void => {
    for (const node of nodes) {
      const nextTrail = [...trail, node];
      if (node.route && isRoutePrefix(node.route, url)) {
        const len = normalizePath(node.route).length;
        if (len > bestLen) {
          bestLen = len;
          best = nextTrail;
        }
      }
      if (node.children) {
        walk(node.children, nextTrail);
      }
    }
  };

  walk(items, []);
  return best;
}

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrl: './sidenav.component.scss',
  imports: [Tree, TreeItem, TreeItemGroup, NgTemplateOutlet, RouterLink],
})
export class SidenavComponent {
  private readonly router = inject(Router);

  /**
   * Component-owned copy of the nav config: the template binds `expanded`
   * two-way, so binding straight to `NAV_ITEMS` would leak UI state into a
   * module-level constant shared by every instance.
   */
  readonly items: NavItem[] = structuredClone(NAV_ITEMS);

  readonly selected = signal<string[]>(this.computeSelected(this.router.url));

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => this.selected.set(this.computeSelected(e.urlAfterRedirects)));
  }

  private computeSelected(url: string): string[] {
    const chain = activeChain(this.items, normalizePath(url));
    // Keep ancestor groups expanded so the active leaf is visible.
    for (const node of chain) {
      if (node.children) {
        node.expanded = true;
      }
    }
    // The tree is single-select and only leaves are selectable, so the
    // ancestors in the chain must not be reported as selected values.
    const leaf = chain.at(-1);
    return leaf && !leaf.children ? [leaf.value] : [];
  }
}
