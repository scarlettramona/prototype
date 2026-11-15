import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

/**
 * compact search affordance: a search-icon button by default; on click it
 * swaps in for a full-width input that takes the remaining row width and
 * is auto-focused. the current query is exposed via the two-way-bindable
 * `value` model so parents can wire it straight into a `MatTableDataSource`
 * filter (or any signal probably)
 */
@Component({
  selector: 'app-search-toggle',
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.search-toggle--open]': 'isOpen()',
    '(keydown.escape)': 'close()',
  },
  templateUrl: './search-toggle.component.html',
  styleUrl: './search-toggle.component.scss',
})
export class SearchToggleComponent {
  readonly value = model('');

  readonly isOpen = signal(false);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly injector = inject(Injector);

  open(): void {
    this.isOpen.set(true);
    // wait for the next render so the `inert` attribute has actually been
    // removed from the field's subtree before we move focus.
    afterNextRender(() => this.searchInput()?.nativeElement.focus(), { injector: this.injector });
  }

  close(): void {
    this.value.set('');
    this.isOpen.set(false);
  }

  onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  onBlur(): void {
    // auto-collapse only when there's no active query, so a filtered list
    // doesn't suddenly hide what it's been filtered by.
    if (!this.value()) {
      this.isOpen.set(false);
    }
  }
}
