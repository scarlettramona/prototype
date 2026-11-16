import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import type { ScanQuery } from '../../../../core/ill/ill.models';
import { summaryParts } from '../../library-model';

/** The collapsed Load scans form: `All wells | 07/19/2026 - 10/19/2026 | [Unsaved] | Edit filters` (Figma 1:2094). */
@Component({
  selector: 'app-filter-summary',
  imports: [MatButtonModule],
  template: `
    <span class="text">{{ parts().wells }}</span>
    <span class="app-divider-vertical"></span>
    <span class="text">{{ parts().dates }}</span>
    @if (parts().chips.length) {
      <span class="app-divider-vertical"></span>
      @for (c of parts().chips; track c) {
        <span class="chip">{{ c }}</span>
      }
    }
    <button mat-button type="button" (click)="edit.emit()">Edit filters</button>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: var(--spacing-160);
      min-height: 36px;
    }
    .text {
      font: var(--mat-sys-body-medium);
    }
    .app-divider-vertical {
      height: 24px;
      align-self: center;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      height: 28px;
      padding: 0 var(--spacing-120);
      border: 1px solid var(--mat-sys-outline);
      border-radius: var(--mat-sys-corner-extra-small);
      font: var(--mat-sys-label-large);
      box-sizing: border-box;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterSummaryComponent {
  readonly query = input.required<ScanQuery>();
  readonly edit = output<void>();
  protected readonly parts = computed(() => summaryParts(this.query()));
}
