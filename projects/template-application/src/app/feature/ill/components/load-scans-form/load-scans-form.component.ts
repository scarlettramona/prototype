import { ChangeDetectionStrategy, Component, effect, input, output, signal, untracked } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { AnalysisFilter, QiFilter, ScanQuery } from '../../../../core/ill/ill.models';
import { startOfDay } from '../../../../core/mock-data/dates';
import { wellLabel } from '../../library-model';

let nextId = 0;

/**
 * Load scans (Figma 1:2014): Start / End date, Well, the Quality indicator and
 * Analysis filters, Load scans and Reset. Edits a draft of `query`; Load scans
 * emits it.
 */
@Component({
  selector: 'app-load-scans-form',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './load-scans-form.component.html',
  styleUrl: './load-scans-form.component.scss',
  host: { class: 'app-filled-fields' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadScansFormComponent {
  protected readonly fieldId = `load-scans-${nextId++}`;
  readonly query = input.required<ScanQuery>();
  readonly wells = input<readonly string[]>([]);
  readonly recent = input<ReadonlySet<string>>(new Set());

  readonly load = output<ScanQuery>();
  readonly reset = output<void>();

  protected readonly qiOptions: QiFilter[] = ['Any', 'Good', 'Suspect', 'Not set'];
  protected readonly analysisOptions: AnalysisFilter[] = ['Any', 'Saved', 'Unsaved'];
  protected readonly draft = signal<ScanQuery>({ start: 0, end: 0, wellIds: [], qi: 'Any', analysis: 'Any' });

  constructor() {
    effect(() => {
      const q = this.query();
      untracked(() => this.draft.set({ ...q, wellIds: [...q.wellIds] }));
    });
  }

  protected date(ts: number): Date {
    return new Date(ts);
  }

  protected label(id: string): string {
    return wellLabel(id, this.recent());
  }

  protected patch(p: Partial<ScanQuery>): void {
    this.draft.update((d) => ({ ...d, ...p }));
  }

  protected setStart(d: Date | null): void {
    if (d) this.patch({ start: startOfDay(d.getTime()), end: Math.max(this.draft().end, startOfDay(d.getTime())) });
  }

  protected setEnd(d: Date | null): void {
    if (d) this.patch({ end: startOfDay(d.getTime()), start: Math.min(this.draft().start, startOfDay(d.getTime())) });
  }
}
