import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

/** The QIs a reviewer can assign. */
export type ReviewQi = 'Good' | 'Suspect';

export interface VnvFormValue {
  qi: ReviewQi;
  comment: string;
}

let nextId = 0;

/**
 * Assigns a QI and comment to a selection: `VNV | N values selected ×`,
 * Quality indicator (Good / Suspect), VNV comment, Cancel / Apply.
 * - `popover`: Figma vnv-popover 1:11679, on the `.app-popover` surface.
 * - `docked`: the table view's right panel (1:10892); actions sit at the bottom.
 * `noun: 'scans'` is the Scan library variant (scan count).
 */
@Component({
  selector: 'app-vnv-form',
  imports: [MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <div class="head">
      <span class="title">VNV</span>
      <span class="app-divider-vertical"></span>
      <span class="count">{{ count() }} {{ noun() }} selected</span>
      <button mat-icon-button type="button" class="close" aria-label="Close" (click)="close.emit()">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <div class="fields">
      <div class="field">
        <span class="label" [id]="id + '-qi'">Quality indicator</span>
        <mat-button-toggle-group class="qi" [attr.aria-labelledby]="id + '-qi'" [value]="qi()" (change)="setQi($event.value)">
          <mat-button-toggle value="Good">Good</mat-button-toggle>
          <mat-button-toggle value="Suspect">Suspect</mat-button-toggle>
        </mat-button-toggle-group>
      </div>
      <div class="field">
        <label class="label" [for]="id + '-comment'">VNV comment</label>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="comment">
          <input matInput [id]="id + '-comment'" placeholder="Placeholder" [value]="comment()" (input)="setComment($any($event.target).value)" />
        </mat-form-field>
      </div>
    </div>

    <div class="actions">
      <button mat-button type="button" (click)="cancel.emit()">Cancel</button>
      <button mat-flat-button type="button" class="apply" [disabled]="!qi()" (click)="submit()">Apply</button>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-240);
      box-sizing: border-box;
    }
    :host(.popover) {
      width: 342px;
    }
    :host(.docked) {
      height: 100%;
    }
    :host(.docked) .actions {
      margin-top: auto;
    }
    .head {
      display: flex;
      align-items: center;
      gap: var(--spacing-80);
      height: 24px;
    }
    .title {
      font: var(--mat-sys-title-medium);
    }
    .count {
      font: var(--mat-sys-body-medium);
    }
    .close {
      margin-left: auto;
      margin-right: calc(-1 * var(--spacing-80));
    }
    .fields {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-160);
    }
    .field {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--spacing-80);
    }
    .label {
      font: var(--mat-sys-label-large);
      color: var(--mat-sys-on-surface-variant);
    }
    .comment {
      width: 100%;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--spacing-160);
    }
  `,
  host: {
    '[class.popover]': "layout() === 'popover'",
    '[class.app-popover]': "layout() === 'popover'",
    '[class.docked]': "layout() === 'docked'",
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VnvFormComponent {
  readonly count = input.required<number>();
  readonly noun = input<'values' | 'scans'>('values');
  readonly layout = input<'popover' | 'docked'>('popover');
  /** Pre-fill, e.g. when every selected item already shares a QI. */
  readonly initial = input<Partial<VnvFormValue> | null>(null);

  readonly apply = output<VnvFormValue>();
  readonly cancel = output<void>();
  readonly close = output<void>();

  protected readonly id = `vnv-form-${nextId++}`;
  private readonly edits = signal<{ qi?: ReviewQi; comment?: string }>({});

  protected readonly qi = computed(() => this.edits().qi ?? this.initial()?.qi ?? null);
  protected readonly comment = computed(() => this.edits().comment ?? this.initial()?.comment ?? '');

  protected setQi(qi: ReviewQi): void {
    this.edits.update((e) => ({ ...e, qi }));
  }

  protected setComment(comment: string): void {
    this.edits.update((e) => ({ ...e, comment }));
  }

  protected submit(): void {
    const qi = this.qi();
    if (!qi) return;
    this.apply.emit({ qi, comment: this.comment().trim() });
  }
}
