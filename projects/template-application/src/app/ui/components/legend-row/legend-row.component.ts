import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SeriesSwatchComponent } from '../series-swatch/series-swatch.component';

export interface LegendSwatch {
  color: string;
  dash: 'solid' | readonly number[];
}

/**
 * A legend entry: swatch · name.
 * - `toggle` (VNV legend, Figma 1:11552): the whole row is a toggle button;
 *   hidden rows dim. No checkbox.
 * - `checkbox` (ILL scans legend, Figma 1:10714): checkbox · plain swatch ·
 *   name. `locked` keeps the checkbox checked and unchangeable (the focused
 *   scan) but draws it like a normal checked box; `emphasis` bolds
 *   it; `indent` nests the Saved / Unsaved sub-rows.
 */
@Component({
  selector: 'app-legend-row',
  imports: [MatCheckboxModule, SeriesSwatchComponent],
  template: `
    @if (mode() === 'toggle') {
      <button type="button" class="toggle" [class.toggle--hidden]="!visible()" [attr.aria-pressed]="visible()" (click)="flip()">
        @if (swatch(); as s) {
          <app-series-swatch [color]="s.color" [dash]="s.dash" marker="ring" />
        }
        <span class="name">{{ label() }}</span>
        @if (tag()) {
          <span class="app-tag">{{ tag() }}</span>
        }
      </button>
    } @else {
      <div class="check" [class.check--indent]="indent()" [class.check--locked]="locked()">
        <mat-checkbox
          [checked]="visible()"
          [indeterminate]="indeterminate()"
          [disabled]="locked()"
          disabledInteractive
          (change)="visible.set($event.checked)"
          [aria-label]="label()"
        />
        @if (swatch(); as s) {
          <app-series-swatch [color]="s.color" [dash]="s.dash" marker="none" />
        }
        <span class="name" [class.name--bold]="emphasis()" [class.name--primary]="labelTone() === 'primary'">{{ label() }}</span>
        @if (tag()) {
          <span class="app-tag">{{ tag() }}</span>
        }
      </div>
    }
  `,
  styles: `
    @use '@angular/material' as mat;

    :host {
      display: block;
    }
    .name {
      font: var(--mat-sys-body-medium);
      color: var(--mat-sys-on-background);
      white-space: nowrap;
    }
    .toggle {
      display: flex;
      align-items: center;
      gap: var(--spacing-60);
      height: 20px;
      padding: 0;
      border: 0;
      background: none;
      cursor: pointer;
      --swatch-ring-fill: var(--mat-sys-surface-container);

      &:hover .name {
        text-decoration: underline;
      }
    }
    .toggle--hidden {
      opacity: 0.38;
    }
    .check {
      display: flex;
      align-items: center;
      gap: var(--spacing-100);
      padding-left: var(--spacing-160);
    }
    .check--indent {
      padding-left: 42px;
    }
    // The focused scan can't be hidden, but Figma (1:10714) draws its box as a
    // normal checked box, not a dimmed one.
    .check--locked {
      @include mat.checkbox-overrides(
        (
          disabled-selected-icon-color: var(--mat-sys-primary),
          disabled-selected-checkmark-color: var(--mat-sys-on-primary),
        )
      );
    }
    .name--bold {
      font-weight: var(--app-font-weight-bold);
    }
    .name--primary {
      color: var(--mat-sys-primary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegendRowComponent {
  readonly label = input.required<string>();
  /** Omit for a row without a series (the "All scans" header row). */
  readonly swatch = input<LegendSwatch | null>(null);
  readonly mode = input<'toggle' | 'checkbox'>('toggle');
  /** Shown on the chart. */
  readonly visible = model(true);
  /** Checkbox mode: partly checked (the "All scans" row). */
  readonly indeterminate = input(false);
  /** Checkbox mode: can't be hidden (the focused scan). */
  readonly locked = input(false);
  /** Checkbox mode: bold label (the focused scan). */
  readonly emphasis = input(false);
  /** Checkbox mode: nested under the row above (Saved / Unsaved). */
  readonly indent = input(false);
  readonly labelTone = input<'default' | 'primary'>('default');
  /** A small tag after the label, e.g. "Reference". Empty for none. */
  readonly tag = input('');

  protected flip(): void {
    if (!this.locked()) this.visible.set(!this.visible());
  }
}
