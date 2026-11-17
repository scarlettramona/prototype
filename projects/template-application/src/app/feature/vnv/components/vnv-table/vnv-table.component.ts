import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, DOCUMENT, inject, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { firstValueFrom } from 'rxjs';
import { downloadText } from '../../../../core/download/download';
import { formatDateTime } from '../../../../core/mock-data/dates';
import { ChartCardComponent } from '../../../../ui/components/chart-card/chart-card.component';
import { QualityFilterComponent } from '../../../../ui/components/quality-filter/quality-filter.component';
import { VnvStore } from '../../vnv-store';
import { readingsToCsv } from '../vnv-chart/vnv-chart-options';
import { buildTableRows, type TableColumn, type TableRow } from './vnv-table-rows';

interface ColumnDef {
  id: TableColumn;
  label: string;
  align?: 'end';
}

/** Row height including its 1 px divider (Figma: 48 px cells). */
const ROW = 49;

/**
 * VNV Table view (Figma 1:10892): checkbox · Sensor · Value · Quality · Date
 * · Comment · Reviewer, with the quality filter, Group by sensor and Export.
 * Same data and selection as the chart; virtual-scrolled for ~68k rows. It
 * opens scrolled to the first selected row, so a selection made on the chart
 * is in view.
 */
@Component({
  selector: 'app-vnv-table',
  imports: [ScrollingModule, MatButtonModule, MatCheckboxModule, MatIconModule, MatProgressBarModule, ChartCardComponent, QualityFilterComponent],
  templateUrl: './vnv-table.component.html',
  styleUrl: './vnv-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VnvTableComponent {
  protected readonly store = inject(VnvStore);
  private readonly document = inject(DOCUMENT);
  protected readonly rowHeight = ROW;
  private readonly viewport = viewChild(CdkVirtualScrollViewport);
  protected readonly date = formatDateTime;

  protected readonly columns: ColumnDef[] = [
    { id: 'sensor', label: 'Sensor' },
    { id: 'value', label: 'Value', align: 'end' },
    { id: 'quality', label: 'Quality' },
    { id: 'date', label: 'Date' },
    { id: 'comment', label: 'Comment' },
    { id: 'reviewer', label: 'Reviewer' },
  ];

  private readonly sensorOrder = computed(() => this.store.result()?.sensors.map((s) => s.id) ?? []);

  constructor() {
    // Switching from the chart with a selection: open on the first selected row
    // (in the table's sort), a row above it so it isn't flush with the header.
    // The viewport sizes its content after its first rendered range; scrolling
    // before that is clamped to the top.
    afterNextRender(async () => {
      const viewport = this.viewport();
      const selected = this.store.selectedIds();
      if (!viewport || !selected.size) return;
      await firstValueFrom(viewport.renderedRangeStream);
      const index = this.rows().findIndex((r) => r.kind === 'reading' && selected.has(r.reading.id));
      if (index > 0) viewport.scrollToIndex(index - 1);
    });
  }

  protected readonly rows = computed<TableRow[]>(() =>
    buildTableRows(this.store.visibleReadings(), this.store.tableSort(), this.store.grouped(), this.sensorOrder(), this.store.collapsedGroups()),
  );

  /** Header checkbox: checked / indeterminate over every visible row. */
  protected readonly headerState = computed(() => {
    const visible = this.store.visibleReadings();
    const selected = this.store.selectedIds();
    let n = 0;
    for (const r of visible) if (selected.has(r.id)) n++;
    return { all: visible.length > 0 && n === visible.length, some: n > 0 && n < visible.length };
  });

  protected trackRow(_: number, row: TableRow): string {
    return row.kind === 'group' ? `g:${row.sensorId}` : row.reading.id;
  }

  protected toggleAll(on: boolean): void {
    this.store.selectAll(
      this.store.visibleReadings().map((r) => r.id),
      on,
    );
  }

  protected groupState(row: Extract<TableRow, { kind: 'group' }>): { all: boolean; some: boolean } {
    const selected = this.store.selectedIds();
    const n = row.readingIds.filter((id) => selected.has(id)).length;
    return { all: n === row.readingIds.length, some: n > 0 && n < row.readingIds.length };
  }

  protected sortBy(column: TableColumn): void {
    const s = this.store.tableSort();
    this.store.tableSort.set({ column, dir: s.column === column && s.dir === 'desc' ? 'asc' : 'desc' });
  }

  protected ariaSort(column: TableColumn): 'ascending' | 'descending' | 'none' {
    const s = this.store.tableSort();
    return s.column !== column ? 'none' : s.dir === 'asc' ? 'ascending' : 'descending';
  }

  /** Clicking a row toggles it; clicks on the checkbox itself are handled by the checkbox. */
  protected onRowClick(event: MouseEvent, id: string): void {
    if ((event.target as HTMLElement).closest('mat-checkbox')) return;
    this.store.toggleSelected(id);
  }

  protected exportCsv(): void {
    const readings = this.rows().flatMap((r) => (r.kind === 'reading' ? [r.reading] : []));
    downloadText(this.document, readingsToCsv(readings), `${this.store.location()?.id ?? 'vnv'}_table.csv`);
  }
}
