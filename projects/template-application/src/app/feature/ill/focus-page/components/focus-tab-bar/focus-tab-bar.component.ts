import { ChangeDetectionStrategy, Component, DestroyRef, effect, ElementRef, inject, output, signal, untracked, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { seriesStyle } from '../../../../../core/charts/chart-palette';
import { formatDateTime } from '../../../../../core/mock-data/dates';
import { ALL_TAB, IllFocusStore } from '../../ill-focus-store';

/**
 * The focus-view tab bar (Figma 1:9554): All scans pinned left, the scan tabs
 * scrolling between ‹ ›, Add scans pinned right. The active scan tab is raised
 * with a 2 px underline in its colour and a close ×; a scan with unsaved work
 * shows a dot in place of the ×.
 */
@Component({
  selector: 'app-focus-tab-bar',
  imports: [MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <div class="tabs" role="tablist" aria-label="Scans">
      <button
        type="button"
        role="tab"
        class="tab tab--all"
        [class.tab--active]="store.active() === all"
        [attr.aria-selected]="store.active() === all"
        (click)="store.select(all)"
      >
        All scans
      </button>

      <button mat-icon-button type="button" class="arrow" aria-label="Scroll tabs left" [disabled]="!canLeft()" (click)="scrollBy(-1)">
        <mat-icon>chevron_left</mat-icon>
      </button>

      <div class="scroller" #scroller (scroll)="syncArrows()">
        @for (scan of store.openScans(); track scan.id) {
          @let active = store.active() === scan.id;
          @let dirty = store.dirty(scan.id);
          <div class="tab" [class.tab--active]="active" [style.--tab-color]="color(scan.colorIndex)" [attr.data-tab]="scan.id">
            <button type="button" role="tab" class="tab__main" [attr.aria-selected]="active" (click)="store.select(scan.id)">
              <span class="dot"></span>
              {{ label(scan.datetime) }}
            </button>
            @if (dirty) {
              <button type="button" class="tab__close" aria-label="Close scan (unsaved analysis)" (click)="close.emit(scan.id)">
                <span class="unsaved-dot"></span>
              </button>
            } @else if (active) {
              <button type="button" class="tab__close" aria-label="Close scan" (click)="close.emit(scan.id)">
                <mat-icon>close_small</mat-icon>
              </button>
            }
          </div>
        }
      </div>

      <button mat-icon-button type="button" class="arrow" aria-label="Scroll tabs right" [disabled]="!canRight()" (click)="scrollBy(1)">
        <mat-icon>chevron_right</mat-icon>
      </button>
    </div>

    <button mat-button type="button" class="add" [matMenuTriggerFor]="addMenu" [disabled]="store.closedScans().length === 0">
      <mat-icon>add</mat-icon>
      Add scans
    </button>
    <mat-menu #addMenu="matMenu" xPosition="before">
      @for (scan of store.closedScans(); track scan.id) {
        <button mat-menu-item type="button" (click)="store.open(scan.id)">
          <span class="menu-item">
            <span class="dot" [style.--tab-color]="color(scan.colorIndex)"></span>
            {{ label(scan.datetime) }}
          </span>
        </button>
      }
    </mat-menu>
  `,
  styles: `
    :host {
      display: flex;
      align-items: stretch;
      justify-content: space-between;
      gap: var(--spacing-160);
      height: 47px;
      min-width: 0;
    }
    .tabs {
      display: flex;
      align-items: stretch;
      min-width: 0;
    }
    .scroller {
      display: flex;
      align-items: stretch;
      min-width: 0;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .tab {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--spacing-80);
      flex-shrink: 0;
      padding: 0 var(--spacing-160);
      border: 0;
      background: none;
      font: var(--mat-sys-title-small);
      color: var(--mat-sys-on-surface-variant);
      white-space: nowrap;
      cursor: pointer;
    }
    .tab--all {
      min-width: 120px;
      justify-content: center;
      color: var(--mat-sys-on-surface);
      --tab-color: var(--mat-sys-primary);
    }
    .tab--active {
      background: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-on-surface);
    }
    .tab--all.tab--active {
      background: none;
    }
    .tab--active::after {
      content: '';
      position: absolute;
      inset: auto 0 0;
      height: 2px;
      background: var(--tab-color);
    }
    .tab__main,
    .tab__close {
      display: flex;
      align-items: center;
      gap: var(--spacing-120);
      height: 100%;
      padding: 0;
      border: 0;
      background: none;
      font: inherit;
      color: inherit;
      cursor: pointer;
    }
    .tab__close {
      justify-content: center;
      width: 24px;
    }
    .tab:focus-visible,
    .tab__main:focus-visible,
    .tab__close:focus-visible {
      outline: 2px solid var(--mat-sys-primary);
      outline-offset: -2px;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--tab-color);
      flex-shrink: 0;
    }
    .unsaved-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--mat-sys-primary);
    }
    .arrow {
      align-self: center;
    }
    .add {
      align-self: center;
      flex-shrink: 0;
    }
    .menu-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-120);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusTabBarComponent {
  protected readonly store = inject(IllFocusStore);
  protected readonly all = ALL_TAB;
  /** Asks to close a scan tab; the page confirms first if it has unsaved work. */
  readonly close = output<string>();

  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');
  protected readonly canLeft = signal(false);
  protected readonly canRight = signal(false);

  constructor() {
    // Keep the active tab in view, and the arrows current as tabs come and go.
    effect(() => {
      const active = this.store.active();
      this.store.openIds();
      untracked(() =>
        requestAnimationFrame(() => {
          const el = this.scroller().nativeElement;
          el.querySelector<HTMLElement>(`[data-tab="${CSS.escape(active)}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          this.syncArrows();
        }),
      );
    });
    const onResize = () => this.syncArrows();
    window.addEventListener('resize', onResize);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('resize', onResize));
  }

  protected color(index: number): string {
    return seriesStyle(index).color;
  }

  protected label(ts: number): string {
    return formatDateTime(ts);
  }

  protected scrollBy(direction: 1 | -1): void {
    const el = this.scroller().nativeElement;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  }

  protected syncArrows(): void {
    const el = this.scroller().nativeElement;
    this.canLeft.set(el.scrollLeft > 1);
    this.canRight.set(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }
}
