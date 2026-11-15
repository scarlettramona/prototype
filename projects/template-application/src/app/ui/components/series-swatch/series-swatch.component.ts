import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * A short line in a series colour, optionally with a ring in the middle.
 * `ring` matches the VNV legend (25×13, Figma 1:11552); `none` matches the ILL
 * scans legend (22×12, Figma 1:11640). Dashes use the palette's patterns.
 */
@Component({
  selector: 'app-series-swatch',
  template: `
    <svg [attr.viewBox]="'0 0 ' + width() + ' ' + height()" [attr.width]="width()" [attr.height]="height()" aria-hidden="true" focusable="false">
      <line x1="0" [attr.y1]="height() / 2" [attr.x2]="width()" [attr.y2]="height() / 2" [attr.stroke]="color()" stroke-width="1.5" [attr.stroke-dasharray]="dashArray()" />
      @if (marker() === 'ring') {
        <circle [attr.cx]="width() / 2" [attr.cy]="height() / 2" r="4.5" [attr.stroke]="color()" stroke-width="1.5" class="ring" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
    }
    .ring {
      fill: var(--swatch-ring-fill, var(--mat-sys-surface-container));
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeriesSwatchComponent {
  readonly color = input.required<string>();
  /** ECharts-style dash: `solid` or a dash array (from `seriesStyle()`). */
  readonly dash = input<'solid' | readonly number[]>('solid');
  readonly marker = input<'ring' | 'none'>('ring');

  protected readonly width = computed(() => (this.marker() === 'ring' ? 25 : 22));
  protected readonly height = computed(() => (this.marker() === 'ring' ? 13 : 12));
  /** `null` removes the attribute for solid lines. */
  protected readonly dashArray = computed(() => {
    const d = this.dash();
    return d === 'solid' ? null : d.join(' ');
  });
}
