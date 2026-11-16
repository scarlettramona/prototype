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
  templateUrl: './vnv-form.component.html',
  styleUrl: './vnv-form.component.scss',
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
