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
  templateUrl: './focus-tab-bar.component.html',
  styleUrl: './focus-tab-bar.component.scss',
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
